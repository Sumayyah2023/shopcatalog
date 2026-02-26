pipeline {
    agent any

    environment {
        PROJECT_NAME = 'shopcatalog'
        COMPOSE_FILE = '/var/jenkins_home/workspace/shopcatalog-pipeline/docker-compose.yml'
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
                echo '🔍 Validating docker-compose...'
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
