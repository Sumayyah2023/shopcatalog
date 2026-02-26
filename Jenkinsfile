pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo '📥 Pulling latest code...'
                checkout scm
            }
        }

        stage('Validate') {
            steps {
                sh 'docker-compose -p shopcatalog config --quiet && echo "✅ Valid"'
            }
        }

        stage('Build Images') {
            steps {
                echo '🐳 Building Docker images...'
                sh 'docker-compose -p shopcatalog build --no-cache'
            }
        }

        stage('Deploy') {
            steps {
                echo '🚀 Deploying...'
                sh 'docker-compose -p shopcatalog down --remove-orphans || true'
                sh 'docker-compose -p shopcatalog up -d'
                sh 'sleep 15'
            }
        }

        stage('Health Check') {
            steps {
                echo '❤️  Checking health...'
                sh '''
                    HOST_IP=$(ip route | grep default | awk "{print \$3}")
                    curl -f http://$HOST_IP:5000/health && echo "✅ Backend OK"
                    curl -fs http://$HOST_IP:3000 > /dev/null && echo "✅ Frontend OK"
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success { echo '🎉 Deployment successful!' }
        failure { echo '❌ Pipeline failed — check logs' }
    }
}
