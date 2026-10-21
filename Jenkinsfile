pipeline {
    agent {
        label 'stock-api-deploy'
    }

    options {
        disableConcurrentBuilds()
        skipDefaultCheckout()
        timeout(time: 10, unit: 'MINUTES')
    }

    parameters {
        string(
            name: 'DEPLOY_SHA',
            defaultValue: '',
            description: 'SHA lengkap image yang sudah dipublikasikan',
            trim: true
        )
    }

    stages {
        stage('Validate SHA') {
            steps {
                script {
                    if (!(params.DEPLOY_SHA ==~ /[0-9a-f]{40}/)) {
                        error('DEPLOY_SHA harus berisi SHA lengkap: 40 karakter heksadesimal.')
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                dir('/home/kirko/projects/stock-api') {
                    sh '''
                        set -eu
                        bash scripts/deploy.sh "$DEPLOY_SHA"
                    '''
                }
            }
        }

        stage('Verify running image') {
            steps {
                dir('/home/kirko/projects/stock-api') {
                    sh '''
                        set -eu
                        container_id=$(docker compose ps -q api)
                        actual=$(docker inspect "$container_id" --format '{{.Config.Image}}')
                        expected="ghcr.io/reyhanhad/stock-api:$DEPLOY_SHA"

                        printf 'Running image: %s\\n' "$actual"
                        test "$actual" = "$expected"
                    '''
                }
            }
        }
    }
}
