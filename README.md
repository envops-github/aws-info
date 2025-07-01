# 🛰️ aws-info

A Node.js script to fetch AWS infrastructure data — including EC2 instances, VPCs, subnets, ENIs, and EBS volumes — and save it as a structured JSON file.

---

## 📋 Prerequisites

Make sure you have **Node.js (v18+)** installed.

Install dependencies:

npm init -y
npm install @aws-sdk/client-ec2

## 🚀 Run

Run the script by passing your AWS credentials and the desired region:

AWS_ACCESS_KEY_ID=your_key AWS_SECRET_ACCESS_KEY=your_secret node awsInventory.js "region"
