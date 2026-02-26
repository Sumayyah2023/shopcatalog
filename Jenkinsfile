pipeline {
    agent any

    environment {
        HOST_IP = '172.17.0.1'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📥 Pulling latest code...'
                checkout scm
            }
        }
        stage('Validate') {
            steps {
                sh 'docker-compose -p shopcatalog config --quiet && echo "Valid"'
            }
        }
        stage('Build Images') {
            steps {
                sh 'docker-compose -p shopcatalog build --no-cache'
            }
        }
        stage('Deploy') {
            steps {
                sh 'docker-compose -p shopcatalog down --remove-orphans || true'
                sh 'docker-compose -p shopcatalog up -d'
                sh 'sleep 15'
            }
        }
        stage('Health Check') {
            steps {
                sh 'curl -f http://172.17.0.1:5000/health && echo "Backend OK"'
                sh 'curl -fs http://172.17.0.1:3000 > /dev/null && echo "Frontend OK"'
            }
        }
        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success { echo 'Deployment successful!' }
        failure { echo 'Pipeline failed!' }
    }
}
