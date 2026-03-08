# Amazon Connect Contact Center

> Production-style AWS contact center architecture demonstrating Amazon Connect, Lex, Lambda, and serverless backend integration.

![AWS](https://img.shields.io/badge/AWS-Amazon%20Connect-FF9900?style=flat&logo=amazonaws)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat&logo=nodedotjs)
![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?style=flat&logo=terraform)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)
![Build](https://github.com/NagRaju001/amazon-connect-contact-center/actions/workflows/deploy.yml/badge.svg)

---

## Overview

This project demonstrates a production-style cloud contact center built on AWS using Amazon Connect, Amazon Lex, and serverless backend services.

Customers can call a phone number and interact with an AI-powered IVR system to:

- Check order status
- Submit return requests
- Speak with a live support agent

The system uses conversational AI to automate common support requests, reducing agent workload while maintaining a seamless escalation path to human support when needed.

The architecture follows a **serverless, event-driven design**, where Amazon Connect manages telephony, Amazon Lex handles natural language understanding, and AWS Lambda provides backend business logic integrated with DynamoDB and REST APIs.

---

## Key Architecture Highlights

- **Serverless architecture** built entirely on AWS managed services
- **Event-driven call handling** using Amazon Connect, Lex, and Lambda
- **Multi-turn conversational AI** with intent-based routing and slot validation
- **Infrastructure as Code** with Terraform for repeatable deployments
- **CI/CD pipeline** using GitHub Actions for automated Lambda deployment
- **Real-time call analytics** using Amazon Contact Lens
- **RESTful API integration** via Amazon API Gateway
- **Highly scalable design** leveraging DynamoDB and stateless Lambda functions

---

## Table of Contents

- [Business Problem](#business-problem)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Call Flow](#call-flow)
- [Example Customer Interaction](#example-customer-interaction)
- [API Reference](#api-reference)
- [Security Considerations](#security-considerations)
- [Deployment](#deployment)
- [System Design Principles](#system-design-principles)
- [Production Readiness](#production-readiness)
- [Challenges and Solutions](#challenges-and-solutions)
- [Future Enhancements](#future-enhancements)
- [What I Learned](#what-i-learned)
- [Contributing](#contributing)
- [License](#license)

---

## Business Problem

Contact centers handling high volumes of repetitive inquiries — such as order status checks and return requests — face significant operational costs and inconsistent customer experiences when relying solely on human agents.

This solution automates tier-1 customer interactions using Amazon Connect and Amazon Lex, enabling customers to self-serve 24/7 without agent intervention, while maintaining seamless escalation to live agents when required.

Key business outcomes:
- Reduced average handle time for common inquiries
- 24/7 availability without additional staffing cost
- Consistent customer experience across all calls
- Real-time and historical analytics via Contact Lens
- Full call recording and compliance-ready transcription

---

## Architecture

![Architecture Diagram](Amazon_Connect_Architecture%20Diagram.png)

### Architecture Overview

The system follows a serverless contact center architecture built entirely on AWS managed services.

**Core components:**

- **Amazon Connect** handles inbound telephony and call routing.
- **Amazon Lex** processes spoken customer requests using natural language understanding.
- **AWS Lambda** executes backend business logic for authentication, order retrieval, and return processing.
- **Amazon API Gateway** exposes REST APIs for order and customer data access.
- **Amazon DynamoDB** stores customer records, order data, and return requests.
- **Amazon Contact Lens** analyzes completed calls for sentiment, transcription, and automated summaries.

This design eliminates the need for server management while enabling horizontal scaling and high availability for contact center workloads.

---

## Features

**Customer Experience:**
- Automatic caller identification via ANI lookup
- Personalized greeting using customer name
- Order status inquiry via voice or DTMF keypad
- Return order submission with reason capture
- Seamless transfer to live agent queue
- Natural multi-turn conversation flow
- Graceful call termination via GoodbyeIntent
- Input validation to prevent incorrect data entry

**Operations and Analytics:**
- Full call recording via Contact Lens
- Automated speech transcription
- Real-time sentiment analysis
- Automated call summarization
- Historical reporting via Amazon QuickSight

**Engineering:**
- Infrastructure as Code via Terraform
- Automated CI/CD deployment via GitHub Actions
- Centralized logging via CloudWatch
- Data protection with Point-in-Time Recovery
- RESTful API layer via API Gateway

---

## Tech Stack

**AWS Services:**
- Amazon Connect — cloud contact center platform
- Amazon Lex — conversational AI and NLU engine
- AWS Lambda — serverless compute (Node.js 20.x)
- Amazon API Gateway — HTTP API management
- Amazon DynamoDB — NoSQL data store
- Amazon Contact Lens — AI call analytics
- Amazon QuickSight — business intelligence dashboard
- Amazon CloudWatch — observability and logging
- Amazon S3 — recording storage and Terraform state
- AWS IAM — identity and access management

**Engineering Tools:**
- Terraform — infrastructure provisioning
- GitHub Actions — CI/CD pipeline
- Node.js — Lambda function runtime
- Postman — API testing and validation

---

## Repository Structure

```
amazon-connect-contact-center/
│
├── .github/
│   └── workflows/
│       └── deploy.yml                      # GitHub Actions CI/CD pipeline
│
├── infra/
│   └── terraform/
│       ├── main.tf                         # Infrastructure as Code definitions
│       └── .terraform.lock.hcl            # Terraform dependency lock file
│
├── connect/
│   └── contact-flows/
│       └── ContactCenter_Project.json     # Amazon Connect flow export
│
├── lex/
│   └── bot-definition/
│       └── ContactCenterBot/
│           ├── Bot.json                    # Bot configuration
│           └── BotLocales/
│               └── en_US/
│                   ├── BotLocale.json      # Language configuration
│                   └── Intents/
│                       ├── CheckOrderStatus/  # Order status intent
│                       ├── ReturnOrder/       # Return order intent
│                       ├── GoodbyeIntent/     # Goodbye intent
│                       └── FallbackIntent/    # Fallback intent
│
├── services/
│   ├── lambdas/
│   │   ├── api-services/                  # Order and return APIs
│   │   │   ├── src/                       # Source code
│   │   │   ├── testcheck/                 # Test files
│   │   │   ├── package.json
│   │   │   └── package-lock.json
│   │   │
│   │   └── lex-hook/                      # Lex fulfillment logic
│   │       ├── src/
│   │       │   └── handler.js             # Main Lambda handler — reads Lex intent,
│   │       │                              #   calls api-services via API Gateway,
│   │       │                              #   returns response back to Lex/Connect
│   │       ├── package.json
│   │       └── package-lock.json
│   │
│   └── scripts/                           # Database seeding scripts
│
├── Amazon_Connect_Architecture Diagram.png  # Architecture diagram
├── .gitignore
└── README.md
```

---

## Call Flow

1. Inbound call received by Amazon Connect
2. `connect-greeting` Lambda invoked
   - Queries DynamoDB Customers table by ANI
   - Returns customer first name for personalization
3. Customer greeted by name
4. Amazon Lex processes customer utterance
   - NLU identifies intent and collects slots
5. `lex-hook` Lambda fulfills intent:
   - **CheckOrderStatus** — retrieves order from DynamoDB via API Gateway and `api-services` Lambda
   - **ReturnOrder** — validates order number, captures return reason, saves record to DynamoDB
   - **SpeakToAgent** — closes Lex session and triggers Connect queue transfer
   - **GoodbyeIntent** — closes session and disconnects
   - **FallbackIntent** — re-prompts with guidance
6. Contact Lens analyzes completed call
   - Transcription, sentiment scoring, automated summary

---

## Example Customer Interaction

**Order Status Check**

> **Customer:** "Where is my order ORD10001?"
>
> **System:** "Your order ORD10001 is currently shipped. Expected delivery is February 28th. Your tracking number is TRK10001. Is there anything else I can help you with?"
>
> **Customer:** "No thanks."
>
> **System:** "Thank you for calling. Have a great day."

---

**Return Request**

> **Customer:** "I want to return my order."
>
> **System:** "Please say your order number or enter the last 4 digits using your keypad."
>
> **Customer:** "0001"
>
> **System:** "What is the reason for your return?"
>
> **Customer:** "Item damaged."
>
> **System:** "Your return request for order ORD10001 has been submitted. Our team will contact you within 24 hours with return instructions."

---

## API Reference

**Base URL:**
```
(https://<your-api-gateway-id>.execute-api.<your-region>.amazonaws.com)
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders/{orderId}` | Retrieve order details by order ID |
| GET | `/customers/phone/{phoneNumber}` | Retrieve customer record by phone number |
| POST | `/returns` | Submit a new return request |
| GET | `/returns/{orderId}` | Retrieve all return requests for an order |
| POST | `/auth` | Authenticate customer by order and email |

**POST /returns — Request Body:**
```json
{
  "orderId": "ORD10001",
  "reason": "Item damaged",
  "customerId": "CUST1001"
}
```

**POST /auth — Request Body:**
```json
{
  "orderId": "ORD10001",
  "email": "customer@example.com"
}
```

---

## Security Considerations

This project follows AWS security best practices for serverless architectures:

- **Least Privilege IAM Policies** — Lambda functions are granted only the permissions required to access specific DynamoDB tables and APIs.
- **Encryption at Rest** — DynamoDB tables use AWS-managed encryption keys.
- **Secure API Access** — API Gateway enforces request validation and integrates with IAM for service authentication.
- **Call Recording Protection** — Amazon Contact Lens provides configurable redaction of sensitive information in transcripts.
- **Data Protection** — DynamoDB Point-in-Time Recovery ensures data can be restored in case of accidental deletion or corruption.
- **Infrastructure Safeguards** — Terraform lifecycle rules prevent accidental destruction of critical resources.

---

## Deployment

**Prerequisites:**
- AWS account with appropriate IAM permissions
- AWS CLI configured with access credentials
- Terraform v1.0 or later
- Node.js 20.x
- Git
- Amazon Connect instance (manual setup required)
- Amazon Lex bot built and published
- GitHub repository secrets configured:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

**Infrastructure Deployment:**
```bash
cd infra/terraform
terraform init
terraform apply
```

**Database Seeding:**
```bash
cd services/scripts
npm install
node seed.js
```

**Application Deployment:**

Push to `main` branch triggers the GitHub Actions pipeline. The pipeline installs dependencies, packages Lambda functions, and deploys directly to AWS Lambda.

**Amazon Connect Configuration:**
1. Create Connect instance in AWS Console
2. Import contact flow JSON
3. Assign phone number to contact flow
4. Associate Lambda functions with Connect instance
5. Build and publish Lex bot

---

## System Design Principles

The system was designed following modern cloud architecture principles:

**Serverless First**
All components are built using AWS managed services to eliminate infrastructure management and enable automatic scaling.

**Separation of Responsibilities**
- Amazon Connect manages telephony and call routing
- Amazon Lex handles conversational AI
- Lambda functions implement business logic
- DynamoDB stores operational data

**Event-Driven Processing**
Customer calls trigger events handled by Connect, which invoke Lex and Lambda functions to process requests.

**Scalability and Fault Isolation**
Each component operates independently, allowing the system to scale horizontally and preventing failures in one service from impacting others.

**Infrastructure Automation**
Terraform ensures reproducible deployments and consistent infrastructure configuration across environments.

---

## Production Readiness

This project incorporates several practices commonly used in enterprise cloud deployments:

- **Centralized logging** through Amazon CloudWatch
- **Call analytics and transcription** using Amazon Contact Lens
- **Automated CI/CD pipeline** with GitHub Actions
- **Infrastructure automation** with Terraform
- **DynamoDB Point-in-Time Recovery** for data protection
- **IAM least-privilege access policies**
- **Graceful conversation termination** via intent-based routing
- **Fallback and validation logic** to prevent incorrect user input

These practices ensure the system is reliable, maintainable, and scalable for real-world contact center workloads.

---

## Challenges and Solutions

**Challenge 1 — ANI Session Attribute Propagation**

| | |
|---|---|
| **Problem** | Customer phone number returned as undefined in Lambda despite being set in Connect flow |
| **Root Cause** | Contact attributes and Lex session attributes are separate namespaces in Connect |
| **Resolution** | Configured phone number as a session attribute within the Get Customer Input block to ensure correct propagation to Lambda |

---

**Challenge 2 — Infrastructure-Managed Data Loss**

| | |
|---|---|
| **Problem** | `terraform apply` destroyed DynamoDB tables during state reconciliation, causing complete data loss |
| **Root Cause** | Tables were managed by Terraform without lifecycle protection |
| **Resolution** | Implemented `prevent_destroy` lifecycle rules, enabled DynamoDB Point-in-Time Recovery, and enabled deletion protection at the table level |

---

**Challenge 3 — CI/CD Pipeline GSI Validation Failure**

| | |
|---|---|
| **Problem** | GitHub Actions pipeline failed consistently due to Terraform GSI validation errors |
| **Root Cause** | Terraform attempted to validate GSI attribute definitions against AWS table state before lifecycle `ignore_changes` could apply |
| **Resolution** | Removed DynamoDB tables from Terraform state management entirely and implemented direct Lambda deployment via AWS CLI in the pipeline |

---

**Challenge 4 — DTMF Input Validation**

| | |
|---|---|
| **Problem** | Bot accepted invalid strings such as "bye" as order numbers during slot collection |
| **Root Cause** | Lex dialog code hook was not enabled, preventing Lambda validation during slot filling |
| **Resolution** | Enabled dialog code hook in Lex intent configuration and implemented `isValidOrderNumber` validation logic in `lex-hook` Lambda |

---

**Challenge 5 — Voice Personalization Approach**

| | |
|---|---|
| **Problem** | Initialize bot with message feature caused call disconnection on voice channel |
| **Root Cause** | Feature is designed for chat only and does not support voice calls |
| **Resolution** | Implemented dedicated `connect-greeting` Lambda invoked by Connect before Lex interaction, following the correct enterprise pattern for voice channel personalization |

---

## Future Enhancements

- Amazon Bedrock integration for natural language understanding beyond predefined intents
- Multi-language support for Spanish-speaking customers
- Amazon Connect Voice ID for biometric authentication
- PCI DSS compliant payment processing flow
- CRM integration with Salesforce Service Cloud
- Real-time agent supervisor dashboard

---

## What I Learned

- Architecture of enterprise Amazon Connect deployments and the interaction between Connect, Lex, and Lambda
- CloudWatch log analysis for distributed serverless system debugging
- Separation of infrastructure management and application data responsibilities in IaC
- ANI-based authentication patterns in contact centers
- CI/CD pipeline design for serverless Lambda deployments
- Contact Lens configuration for call analytics and compliance recording
- DynamoDB data protection strategies for production environments

---

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue before submitting a pull request to discuss proposed changes.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

**Author:** Nagaraju
**Domain:** Amazon Connect | Cloud Contact Center | AWS
**Region:** us-east-1
**Year:** 2026
