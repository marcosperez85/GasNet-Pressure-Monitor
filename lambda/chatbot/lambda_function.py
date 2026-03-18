import json
import boto3
import logging

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
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
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Query is required'})
            }
        
        # Cliente de Bedrock
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        
        # Configuración para Llama3
        prompt = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n{query}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"
        
        body_params = {
            "prompt": prompt,
            "max_gen_len": 1000,
            "temperature": 0.7,
            "top_p": 0.9
        }
        
        # Llamada a Bedrock con Llama3
        response = bedrock.invoke_model(
            modelId='meta.llama3-8b-instruct-v1:0',
            body=json.dumps(body_params)
        )
        
        # Procesar respuesta de Llama3
        response_body = json.loads(response['body'].read())
        bot_response = response_body['generation']
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': bot_response
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }