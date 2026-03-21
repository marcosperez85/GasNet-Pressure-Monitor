import json
import boto3
import logging

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
         # 👇 PRIMERO manejar preflight
        if event.get("httpMethod") == "OPTIONS":
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': ''
            }

        # 👇 DESPUÉS tu lógica normal
        
        # Parsear el cuerpo de la request
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
            
        query = body.get('query', '')
        
        if not query:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Query is required'})
            }
        
        # Cliente de Bedrock
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        
        body_params = {
            "anthropic_version": "bedrock-2023-05-31",
            "system": "You are an industrial assistant specialized in operations, calculations, and process optimization. Be precise, concise, and avoid unnecessary explanations. Always respond in Spanish. Use clear structured answers. Add new lines when creating a bullet list of tasks for better readability. If you don't know the answer, say 'No dispongo de esa información'",
            "messages": [
                {
                    "role": "user",
                    "content": query
                }
            ],
            "max_tokens": 2000,
            "temperature": 0.7
        }

        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-3-7-sonnet-20250219-v1:0',
            body=json.dumps(body_params)
        )

        response_body = json.loads(response['body'].read())
        bot_response = response_body['content'][0]['text']
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'response': bot_response
            })
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }