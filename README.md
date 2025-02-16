# Web Application Setup and Usage

## Installation and Setup

To get started with the web application, follow the steps below:

### 1. Backend Setup

1. In the root directory of the project, install the necessary dependencies:

   ```bash
   npm install
   ```

2. Start the backend server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup

1. Navigate to the `client` directory:

   ```bash
   cd client
   ```

2. Install the necessary dependencies:

   ```bash
   npm install
   ```

3. Start the Vite React application:
   ```bash
   npm run dev
   ```

### 3. Database Setup

Make sure you have a MySQL database ready. Set up the connection details in the `.env` file with your database credentials.

---

## Jenkins CI/CD Pipeline

This project implements a **Jenkins pipeline** for automating the deployment process using Docker,AWS ECR, EKS, and Kubernetes. Below is a breakdown of each stage in the pipeline:

### **1. Checkout Code**

- Clones the latest version of the repository from GitHub.

### **2. Build Docker Image**

- Retrieves the latest commit hash.
- Builds a Docker image for the backend application.
- Tags the image with the commit hash.

### **3. Login to AWS ECR**

- Uses AWS credentials to authenticate and log in to **Amazon Elastic Container Registry (ECR)**.

### **4. Tag and Push Image**

- Tags the newly built Docker image.
- Pushes the image to AWS ECR.

### **5. Check & Create EKS Cluster**

- Checks if an **Amazon Elastic Kubernetes Service (EKS)** cluster named `Devesh` exists.
- If not found, creates a new EKS cluster.

### **6. Update Kubeconfig & Authenticate**

- Updates the `kubectl` configuration to connect to the EKS cluster.
- Ensures Jenkins has authentication to manage Kubernetes resources.

### **7. Apply Kubernetes Configurations**

- Deploys the Kubernetes configurations stored in the `deployment/` directory.
- Ensures the latest configurations are applied to the cluster.

### **8. Update Kubernetes Deployment with New Image**

- Updates the Kubernetes deployment with the latest Docker image from ECR.
- Forces a pod restart to ensure the application runs with the latest build.

### **9. Get Load Balancer DNS & Deploy Infrastructure**

- Waits for the AWS Load Balancer to be ready.
- Retrieves the Load Balancer DNS.
- Uses **Terraform** to deploy necessary infrastructure components.

---

## Running the Jenkins Pipeline

### **Prerequisites**

- Ensure Jenkins is installed and configured on your server.
- Install necessary Jenkins plugins: **Pipeline, AWS Credentials, Kubernetes CLI, Docker Pipeline**.
- Add AWS credentials in Jenkins under **Manage Credentials**.

### **Steps to Run the Pipeline**

1. Create a new **Pipeline Job** in Jenkins.
2. Configure the job to use the **Jenkinsfile** from the GitHub repository.
3. Save and trigger the pipeline.
4. Monitor the logs to ensure successful execution.

---

## Roles in the Web Application

### **Normal User**

- A normal user can see the banner displayed on the application.
- However, they **cannot toggle the banner's visibility**. To do that, the user must log in first.

### **Admin User**

- An admin user has access to the dashboard.
- The admin can update the banner information, including title, description, link, and visibility status.

Ensure you have the appropriate roles set up in your database for correct access control within the application.
