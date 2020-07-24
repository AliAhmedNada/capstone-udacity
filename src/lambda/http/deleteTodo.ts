import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'

import {deleteTodo} from "../../businesslogic/todos";


export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const authorization = event.headers.Authorization
  const split = authorization.split(' ')
  const jwtToken = split[1]

  const todoId = event.pathParameters.todoId;

  await deleteTodo(todoId, jwtToken);

  return {
    statusCode: 202,
    headers: {
      'Access-Control-Allow-Origin': '*',
      "Access-Control-Allow-Credentials": true,
      'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
         },
    body: JSON.stringify({})
  }
};