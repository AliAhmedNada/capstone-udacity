import * as AWS  from 'aws-sdk'
const AWSXRay = require('aws-xray-sdk')
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'

const XAWS = AWSXRay.captureAWS(AWS)

const bucketName = process.env.TODOITEM_S3_BUCKET_NAME


function createDynamoDBClient() {
    if (process.env.IS_OFFLINE) {
      console.log('Creating a local DynamoDB instance')
      return new XAWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8005'
      })
    }
  
    return new XAWS.DynamoDB.DocumentClient()
}
export class TodoAccess {
    constructor(
        private readonly docClient: DocumentClient = createDynamoDBClient(),
        private readonly todosTable = process.env.TODOITEM_TABLE,
        private readonly todosUserIndex = process.env.TODOITEM_TABLE_GSI
        ) {
    }
    async getAllTodos(userId: string): Promise<TodoItem[]> {
        console.log('Getting all todos')
        const result = await this.docClient.scan({
            TableName: this.todosTable,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId' : userId
            }
        }).promise()
        const items = result.Items
        return items as TodoItem[]
    }

    async getTodoItem(todoId: string, userId: string): Promise<TodoItem> {
        const result = await this.docClient.query({
            TableName: this.todosTable,
            IndexName: this.todosUserIndex,
            KeyConditionExpression: 'userId = :userId and todoId = :todoId',
            ExpressionAttributeValues: {
                ':userId' : userId,
                ':todoId' : todoId
            }
        }).promise()
        
        const item = result.Items[0]
        console.log('item',item)
        return item as TodoItem
    }

    async createTodo(todo: TodoItem): Promise<TodoItem> {
        await this.docClient.put({
            TableName: this.todosTable,
            Item: todo
        }).promise()

        return todo
    }

    async updateTodo(todoId: string, createdAt: string, update: TodoUpdate): Promise<void> {
        var params = {
            TableName: this.todosTable,
            Key: {
                "todoId": todoId,
                "createdAt": createdAt
            },
            UpdateExpression:
                'set #n = :name, done = :done, dueDate = :dueDate',
            ExpressionAttributeValues: {
                ':name': update.name,
                ':done': update.done,
                ':dueDate': update.dueDate,
            },
            ExpressionAttributeNames: {
                '#n': 'name'
            },
            ReturnValues: 'UPDATED_NEW'
        };
        
        this.docClient.update(params).promise()
    }

    async deleteTodo(userId: string, createdAt: string): Promise<void> {

        var params = {
            TableName: this.todosTable,
            Key: {
                "userId": userId,
                "createdAt": createdAt
            },
            ConditionExpression:
                'userId = :userId and createdAt = :createdAt',
            ExpressionAttributeValues: {
                ':userId': userId,
                ':createdAt': createdAt
            }
        }
        console.log("params",JSON.stringify(params))
        await this.docClient.delete(params).promise()
    }

    

    async generateUploadUrl(todoId: string, userId: string, createdAt :string): Promise<string> {
/* 
        const s3 = new XAWS.S3({
            signatureVersion: 'v4'
          })
          console.log("todoId:",todoId)
          console.log("userId:",userId)
        const uploadUrl = await s3.getSignedUrl("putObject", {
          Bucket: bucketName,
          Key: todoId,
          Expires:urlExpiration
      });
      console.log("uploadUrl",uploadUrl)
 */

        console.log("Generating URL");
        const s3 = new XAWS.S3({
            signatureVersion: 'v4'
          })
          console.log("todoId:",todoId)

        const url = s3.getSignedUrl('putObject', {
            Bucket: bucketName,
            Key: todoId,
            Expires: 1000,
        });
        console.log(url);

      await this.docClient.update({
            TableName: this.todosTable,
            Key: { 
                "userId":userId, 
                "createdAt": createdAt,
            },
            UpdateExpression: "set attachmentUrl=:URL",
            ExpressionAttributeValues: {
              ":URL": url.split("?")[0]
          },
          ReturnValues: "UPDATED_NEW"
        })
        .promise();
      return url;
    }

  }