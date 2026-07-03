import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DeliveryAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'OrdersTable', {
      partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const bedrockTask = new tasks.BedrockInvokeModel(this, 'ProcessOrderWithBedrock', {
      model: tasks.BedrockFoundationModel.ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0,
      input: {
        body: sfn.TaskInput.fromObject({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 1000,
          messages: [{ role: "user", content: sfn.JsonPath.stringAt('$.pedido') }]
        })
      },
      resultSelector: {
        "analysis.$": "$.Body.content[0].text"
      }
    });

    const saveStatusTask = new tasks.DynamoPutItem(this, 'SaveStatus', {
      table: table,
      item: {
        orderId: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.orderId')),
        status: tasks.DynamoAttributeValue.fromString("PROCESSED"),
        analysis: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.analysis'))
      }
    });

    const definition = bedrockTask.next(saveStatusTask);

    new sfn.StateMachine(this, 'DeliveryStateMachine', {
      definition,
      timeout: cdk.Duration.minutes(5)
    });
  }
}