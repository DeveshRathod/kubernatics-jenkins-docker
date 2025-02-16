pipeline {
    agent any
    environment {
        AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID')
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
        AWS_REGION = 'ap-south-1'
        CLUSTER_NAME = 'Devesh'
        AWS_ACCOUNT_ID = '038462784201' // Replace with actual AWS Account ID
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/DeveshRathod/backend-todo'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t backend .'
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh '''
                aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                '''
            }
        }

        stage('Tag and Push Image') {
            steps {
                sh '''
                docker tag backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/backend:latest
                docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/backend:latest
                '''
            }
        }

        stage('Check & Create EKS Cluster') {
            steps {
                script {
                    sh '''
                    echo "Checking if EKS cluster ${CLUSTER_NAME} exists..."
                    EXISTING_CLUSTER=$(aws eks describe-cluster --name "${CLUSTER_NAME}" --region "${AWS_REGION}" --query "cluster.status" --output text 2>&1 || echo "NOT_FOUND")
                    
                    if [[ "$EXISTING_CLUSTER" == "ACTIVE" ]]; then
                        echo "Cluster ${CLUSTER_NAME} already exists."
                    else
                        echo "Cluster ${CLUSTER_NAME} does not exist. Creating EKS cluster..."
                        aws eks create-cluster \
                            --name "${CLUSTER_NAME}" \
                            --region "${AWS_REGION}" \
                            --role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/EKS-ClusterRole \
                            --resources-vpc-config subnetIds=subnet-abc123,subnet-def456,securityGroupIds=sg-xyz789

                        echo "Waiting for cluster creation..."
                        aws eks wait cluster-active --name "${CLUSTER_NAME}" --region "${AWS_REGION}"
                        echo "Cluster ${CLUSTER_NAME} is now active."
                    fi
                    '''
                }
            }
        }

        stage('Update Kubeconfig & Authenticate') {
            steps {
                script {
                    sh '''
                    echo "Updating Kubeconfig..."
                    aws eks update-kubeconfig --region "${AWS_REGION}" --name "${CLUSTER_NAME}"
                    echo "Verifying Kubernetes Authentication..."
                    kubectl get nodes || { echo "Jenkins is NOT authenticated with EKS"; exit 1; }
                    '''
                }
            }
        }

        stage('Apply Kubernetes Configurations') {
            steps {
                script {
                    sh '''
                    echo "Applying Kubernetes configurations from deployment directory..."
                    kubectl apply -f deployment/ || { echo "Failed to apply Kubernetes configurations"; exit 1; }
                    '''
                }
            }
        }

        stage('Get Load Balancer DNS & Deploy Infra') {
            steps {
                script {
                    sh '''
                    echo "Waiting for Load Balancer DNS..."
                    
                    timeout=300
                    while [ $timeout -gt 0 ]; do
                        LB_DNS=$(kubectl get svc backend-service -o jsonpath='{.status.loadBalancer.ingress[*].hostname}')
                        
                        if [[ -n "$LB_DNS" ]]; then
                            echo "Load Balancer is ready: $LB_DNS"
                            break
                        fi
                        
                        echo "Still waiting for Load Balancer..."
                        sleep 10
                        timeout=$((timeout-10))
                    done
                    
                    if [[ -z "$LB_DNS" ]]; then
                        echo "Error: Load Balancer DNS not found!"
                        exit 1
                    fi

                    echo "Initializing and Applying Terraform..."
                    cd terraform/
                    terraform init
                    terraform apply -var="backend_lb_dns=$LB_DNS" -auto-approve
                    '''
                }
            }
        }
    }
}