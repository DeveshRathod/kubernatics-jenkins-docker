pipeline {
    agent any
    environment {
        AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID') 
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY') 
        ECR_URL = "038462784201.dkr.ecr.ap-south-1.amazonaws.com/backend"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/DeveshRathod/kubernatics-jenkins-docker'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def GIT_COMMIT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    def IMAGE_TAG = "${ECR_URL}:${GIT_COMMIT}"

                    sh "docker build -t ${IMAGE_TAG} ."
                }
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh '''
                aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 038462784201.dkr.ecr.ap-south-1.amazonaws.com
                '''
            }
        }

        stage('Tag and Push Image') {
            steps {
                script {
                    def GIT_COMMIT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    def IMAGE_TAG = "${ECR_URL}:${GIT_COMMIT}"

                    sh """
                    docker tag backend:latest ${IMAGE_TAG}
                    docker tag backend:latest ${ECR_URL}:latest
                    docker push ${IMAGE_TAG}
                    docker push ${ECR_URL}:latest
                    """
                }
            }
        }

        stage('Check & Create EKS Cluster') {
            steps {
                script {
                    sh '''
                    echo "Checking if EKS cluster exists..."
                    
                    if ! aws eks describe-cluster --name Devesh --region ap-south-1 > /dev/null 2>&1; then
                        echo "EKS cluster not found. Creating one..."
                        eksctl create cluster --name Devesh --region ap-south-1 --node-type t2.small
                        
                        echo "Waiting for EKS cluster to be ready..."
                        until aws eks describe-cluster --name Devesh --region ap-south-1 --query 'cluster.status' --output text | grep -q "ACTIVE"; do
                            echo "Cluster is still creating... Checking again in 30 seconds."
                            sleep 30
                        done
                        echo "EKS cluster is now ready."
                    else
                        echo "EKS cluster already exists. Skipping creation."
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
                    
                    export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
                    export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

                    aws eks update-kubeconfig --region ap-south-1 --name Devesh || { echo "Failed to update kubeconfig"; exit 1; }

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
                    echo "Applying all Kubernetes configurations from deployment directory..."
                    kubectl apply -f deployment/ || { echo "Failed to apply Kubernetes configurations"; exit 1; }
                    '''
                }
            }
        }

        stage('Update Kubernetes Deployment with New Image') {
            steps {
                script {
                    def GIT_COMMIT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    def IMAGE_TAG = "${ECR_URL}:${GIT_COMMIT}"

                    sh """
                    echo "Updating Kubernetes deployment with new image: ${IMAGE_TAG}"
                    kubectl set image deployment/backend-deployment backend=${IMAGE_TAG} --record
                    kubectl rollout status deployment/backend-deployment || { echo "Rollout failed"; exit 1; }
                    """
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
                    cd deployment/
                    terraform init
                    terraform apply -var="backend_lb_dns=$LB_DNS" -auto-approve
                    '''
                }
            }
        }
    }
}
