  
import { APIGatewayProxyEvent, APIGatewayProxyResult ,APIGatewayProxyHandler } from 'aws-lambda'
import 'source-map-support/register'

import { generateUploadUrl } from '../../businessLogic/todos'





export const handler : APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  const authorization = event.headers.Authorization;
  const split = authorization.split(' ')
  const jwtToken = split[1]

 const url = await generateUploadUrl(todoId,jwtToken)
  
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*'    
    },

    body: JSON.stringify({
      uploadUrl:url
    })
  }
  }