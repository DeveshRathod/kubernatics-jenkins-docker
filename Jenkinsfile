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

        stage('Build') {
            stages {
                stage('Retrieve Git Commit ID') {
                    steps {
                        script {
                            env.GIT_COMMIT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                        }
                    }
                }

                stage('Build Docker Image') {
                    steps {
                        script {
                            def IMAGE_TAG = "${ECR_URL}:${env.GIT_COMMIT}"
                            sh "docker build -t ${IMAGE_TAG} ."
                        }
                    }
                }
            }
        }

        stage('Authenticate & Push Image') {
            stages {
                stage('Login to AWS ECR') {
                    steps {
                        sh '''
                        aws ecr get-login-password --region ap-south-1 | \
                        docker login --username AWS --password-stdin 038462784201.dkr.ecr.ap-south-1.amazonaws.com
                        '''
                    }
                }
                
                stage('Tag Image') {
                    steps {
                        script {
                            def IMAGE_TAG = "${ECR_URL}:${env.GIT_COMMIT}"
                            sh """
                            docker tag backend:latest ${IMAGE_TAG}
                            docker tag backend:latest ${ECR_URL}:latest
                            """
                        }
                    }
                }

                stage('Push Image to ECR') {
                    steps {
                        script {
                            def IMAGE_TAG = "${ECR_URL}:${env.GIT_COMMIT}"
                            sh """
                            docker push ${IMAGE_TAG}
                            docker push ${ECR_URL}:latest
                            """
                        }
                    }
                }
            }
        }

        stage('Cleanup Old Docker Images') {
            steps {
                script {
                    sh '''
                    echo "Removing old Docker images..."
                    docker image prune -af || echo "Failed to remove old images"
                    '''
                }
            }
        }

        stage('EKS Cluster Management') {
            stages {
                stage('Check & Create EKS Cluster') {
                    steps {
                        script {
                            sh '''
                            echo "Checking if EKS cluster exists..."
                            if ! aws eks describe-cluster --name Devesh --region ap-south-1 > /dev/null 2>&1; then
                                echo "EKS cluster not found. Creating one..."
                                eksctl create cluster --name Devesh --region ap-south-1 --node-type t2.small
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
                            aws eks update-kubeconfig --region ap-south-1 --name Devesh || exit 1
                            kubectl get nodes || exit 1
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            stages {
                stage('Apply Kubernetes Configurations') {
                    steps {
                        script {
                            sh '''
                            kubectl apply -f deployment/ || exit 1
                            '''
                        }
                    }
                }
                
                stage('Update Deployment with New Image') {
                    steps {
                        script {
                            def IMAGE_TAG = "${ECR_URL}:${env.GIT_COMMIT}"
                            sh """
                            kubectl set image deployment/backend-deployment backend-container=${IMAGE_TAG} --record || exit 1
                            kubectl delete pods -l app=backend || exit 1
                            kubectl wait --for=condition=ready pod -l app=backend --timeout=120s || exit 1
                            """
                        }
                    }
                }
            }
        }

        stage('Infrastructure Deployment') {
            stages {
                stage('Get Load Balancer DNS') {
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
                                sleep 10
                                timeout=$((timeout-10))
                            done
                            if [[ -z "$LB_DNS" ]]; then
                                exit 1
                            fi
                            '''
                        }
                    }
                }

                stage('Deploy Infrastructure with Terraform') {
                    steps {
                        script {
                            sh '''
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
    }
}