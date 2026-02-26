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
                echo '🔍 Validating docker-compose...'
                sh 'docker compose -f docker-compose.yml config --quiet && echo "✅ Valid"'
            }
        }

        stage('Build Images') {
            steps {
                echo '🐳 Building Docker images...'
                sh 'docker compose build --no-cache'
            }
        }

        stage('Deploy') {
            steps {
                echo '🚀 Deploying...'
                sh 'docker compose down --remove-orphans'
                sh 'docker compose up -d'
                sh 'sleep 15'
            }
        }

        stage('Health Check') {
            steps {
                echo '❤️  Checking health...'
                sh 'curl -f http://localhost:5000/health && echo "✅ Backend OK"'
                sh 'curl -fs http://localhost:3000 > /dev/null && echo "✅ Frontend OK"'
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
