import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const XAWS = AWSXRay.captureAWS(AWS)

import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'

export class TodosAccess {
    constructor(
        private readonly docClient: DocumentClient = createDynamoDBClient(),
        private readonly todosTable = process.env.TODOITEM_TABLE,
        private readonly todosUserIndex = process.env.TODOITEM_TABLE_GSI
        ) {
    }

    async getAllTodos(userId: string): Promise<TodoItem[]> {
        console.log('Getting all todos')
        
        const result = await this.docClient.query({
            TableName: this.todosTable,
            IndexName: this.todosUserIndex,
            KeyConditionExpression: 'userId = :userId',
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

    async deleteTodo(todoId: string, createdAt: string): Promise<void> {

        var params = {
            TableName: this.todosTable,
            Key: {
                "todoId": todoId,
                "createdAt": createdAt
            },
            ConditionExpression:
                'todoId = :todoId and createdAt = :createdAt',
            ExpressionAttributeValues: {
                ':todoId': todoId,
                ':createdAt': createdAt
            }
        }

        await this.docClient.delete(params).promise()
    }

    async setItemUrl(todoId: string, createdAt: string, itemUrl: string): Promise<void> {
        var params = {
            TableName: this.todosTable,
            Key: {
                todoId,
                createdAt
            },
            UpdateExpression: 'set attachmentUrl = :attachmentUrl',
            ExpressionAttributeValues: {
                ':attachmentUrl': itemUrl
            },
            ReturnValues: 'UPDATED_NEW'
        }

        await this.docClient.update(params).promise();
    }

}

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