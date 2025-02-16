pipeline {
    agent any
    environment {
        AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID') 
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY') 
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
                aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 038462784201.dkr.ecr.ap-south-1.amazonaws.com
                '''
            }
        }

        stage('Tag and Push Image') {
            steps {
                sh '''
                docker tag backend:latest 038462784201.dkr.ecr.ap-south-1.amazonaws.com/backend:latest
                docker push 038462784201.dkr.ecr.ap-south-1.amazonaws.com/backend:latest
                '''
            }
        }

        stage('Update Kubeconfig & Authenticate') {
            steps {
                script {
                    sh '''
                    echo "Updating Kubeconfig..."
                    
                    export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}
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
