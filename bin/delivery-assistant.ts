#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DeliveryAssistantStack } from '../lib/delivery-assistant-stack';

const app = new cdk.App();
new DeliveryAssistantStack(app, 'DeliveryAssistantStack', {});