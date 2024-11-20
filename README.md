# demo-web-app
Basic web application for demo and pipeline testing purposes

## App structure and relevant files

- Docker image (node app)
- Helm values (redis)
- Helm chart (node app)
    - Post-sync job (redis benchmark test)
- Helm values (nginx)

For both Redis and Nginx, public helm charts were used with custom values files pushed here. 

**Note**, the following files need to be updated where I've added the text "REPLACEME" (a Ctrl+f should find this easily):

- ``helm/redis/values.yaml``: update the password, my intent was to source this from a secret in Argo or AWS Secrets manager. This is the only place it needs to be updated, it is sourced from the k8s secret everywhere else.


## Build

The only build required for this app is the docker image, for which all files are contained in the docker directory. 

From an x86 machine in the docker directory:

    docker build -t <image repository>/<name>:<tag> .

From an arm machine in the docker directory (I used the following building on a Mac):

    docker buildx build --platform=linux/amd64 -t <image repository>/<name>:<tag> .

In the event you want to demo a quick change to the app without updating too much code, I suggest updating the banner color at the top of the page. You can update this in ``docker/static/css/main.css``, line 44.


## Deploy

Deployment should be handled in three phases, along with a post-sync job. As a prerequisite, create the target namespace for the application stack:

    kubectl create namespace demo-web-app

### Phase 1 - Redis

In order to deploy (from the helm/redis folder):

    helm install redis . -n demo-web-app

In order to disable replication, update line 127 in the values file from ``architecture: replication`` to ``architecture: standalone``

### Phase 2 - Node app

In order to deploy (from the helm/node folder): 

    helm install node . -n demo-web-app

In order to update the image version, update line 11 in the values file.

### Phase 3 - Nginx

In order to deploy (from the helm/nginx folder):

    helm install nginx . -n demo-web-app

**Note**: if the release name is changed for the node deployment in Phase 2, you will need to update the upstream load balancer in the server block (values.yaml line 582 or Ctrl+f 'serverBlock')

### Post-sync job

This is just a simple kubernetes job that will run the redis benchmark test and write the results to a file on the PV (see file post-sync/redis_client.yaml). The results will be displayed in the web app once the file is available. 

**Note**: you may want to bump up the number of queries executed as part of the benchmark test, I kept this relatively low (1000) for development purposes, see helm/node/values.yaml "benchmark" key at the end of the file.

### Accessing the application

Run the following command to get the load balancer endpoint:

    kubectl get svc --namespace demo-web-app nginx -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

### Teardown

    helm uninstall nginx -n demo-web-app
    helm uninstall node -n demo-web-app
    helm uninstall redis -n demo-web-app
    kubectl delete namespace demo-web-app
