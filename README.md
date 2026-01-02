# Kubernetes Upgrade Demonstration: v1.34 to v1.35

This repository contains a sample Node.js application and the necessary infrastructure manifests to demonstrate a Kubernetes cluster upgrade from version 1.34 to 1.35. The application provides a real-time dashboard that displays pod telemetry, making it easy to visualize how workloads are managed during a rolling update.

## Project Components

### Application Layer
The application is a lightweight Node.js server built with Express. It provides a telemetry API that retrieves pod information directly from the Kubernetes environment using the Downward API.
- server.js: The backend server logic.
- public/: A modern frontend dashboard showing pod name, node name, namespace, and system metrics.

### Containerization
The project includes a multi-stage Dockerfile that produces a minimal runtime image.
- Dockerfile: Optimized for production-grade deployments.

### Kubernetes Manifests
Standard resource definitions for deploying the application and exposing it to external traffic.
- k8s/manifests.yaml: Includes a Deployment with three replicas and a LoadBalancer Service. It also configures the Downward API to inject environment variables.

### Cluster Setup and Automation
Tools to quickly provision a test environment on AWS EC2 or local machines.
- setup-k8s.sh: A shell script for Ubuntu-based systems that installs Docker, Kind, and Kubectl.
- kind-config.yaml: A Kind cluster configuration that initializes a three-node cluster (one control plane and two workers) at version 1.34.0.

## Usage Instructions

### Environment Preparation
1. Copy the setup script to your Ubuntu instance and execute it:

   ```bash
   chmod +x setup-k8s.sh
   ./setup-k8s.sh
   ```

2. Update Docker group:

   ```bash
   newgrp docker
   ```

3. Provision the Kind cluster:
   ```bash
   kind create cluster --config kind-config.yaml --name upgrade-demo
   ```

### Deployment
1. Build and push your container image:
   ```bash
   docker build -t your-registry/k8s-demo-app:v1.0.0 .
   docker push your-registry/k8s-demo-app:v1.0.0
   ```

2. Update the image field in `k8s/manifests.yaml` with your specific image tag.

3. Deploy the application:
   ```bash
   kubectl apply -f k8s/manifests.yaml
   ```

### Cluster Upgrade Process (Simulated Production Flow)
Because **Kind** runs Kubernetes inside Docker containers, you must execute the `kubeadm` and `apt` commands **inside** the specific node containers. This provides a perfect simulation of a real server upgrade.

#### 1. Prepare the Control Plane
First, enter the control-plane container to update the management tools.
   ```bash
   # 1. Enter the container
   docker exec -it upgrade-demo-control-plane bash

   # 2. (Inside the container) Update package list and configure v1.35 repo
   apt update
   apt install -y curl gnupg
   curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.35/deb/Release.key | gpg --dearmor --yes -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
   echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.35/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
   apt update

   # 3. (Inside the container) Upgrade kubeadm
   apt-mark unhold kubeadm
   apt install -y kubeadm=1.35.0-1.1

   # 4. (Inside the container) Verify the upgrade plan
   kubeadm upgrade plan --ignore-preflight-errors=SystemVerification
   ```

#### 2. Execute Control Plane Upgrade
While still inside the `upgrade-demo-control-plane` container (or using another terminal for the drain):
   ```bash
   # From your AWS EC2 host (not inside the container):
   kubectl drain upgrade-demo-control-plane --ignore-daemonsets

   # Inside the control-plane container:
   kubeadm upgrade apply v1.35.0 --ignore-preflight-errors=SystemVerification

   # Upgrade kubelet and kubectl inside the container:
   apt install -y kubelet=1.35.0-1.1 kubectl=1.35.0-1.1
   systemctl restart kubelet

   # From your AWS EC2 host:
   kubectl uncordon upgrade-demo-control-plane
   ```

#### 3. Upgrade Worker Nodes
Repeat this process for the worker nodes.
   ```bash
   # 1. Drain the worker from EC2 host:
   kubectl drain upgrade-demo-worker --ignore-daemonsets

   # 2. Enter the worker container:
   docker exec -it upgrade-demo-worker bash

   # 3. (Inside worker) Configure repo and upgrade tools:
   apt update
   apt install -y curl gnupg
   curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.35/deb/Release.key | gpg --dearmor --yes -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
   echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.35/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
   apt update

   # 4. (Inside worker) Install tools and upgrade node:
   apt-mark unhold kubeadm kubelet kubectl
   apt install -y kubeadm=1.35.0-1.1
   kubeadm upgrade node --ignore-preflight-errors=SystemVerification
   apt install -y kubelet=1.35.0-1.1 kubectl=1.35.0-1.1
   apt-mark hold kubeadm kubelet kubectl
   systemctl restart kubelet

   # 4. From your AWS EC2 host:
   kubectl uncordon upgrade-demo-worker
   ```

### Alternative: Native Kind Upgrade (Cluster Recreation)
If you do not need to simulate the manual `kubeadm` process, the standard "Kind-native" way to upgrade is to delete the cluster and recreate it using a newer node image.

1. **Delete the existing v1.34 cluster:**
   ```bash
   kind delete cluster --name upgrade-demo
   ```

2. **Recreate with the v1.35 image:**
   Modify your `kind-config.yaml` to use `image: kindest/node:v1.35.0` or run:
   ```bash
   kind create cluster --config kind-config.yaml --name upgrade-demo --image kindest/node:v1.35.0
   ```

### Demonstration Guidance
Access the application dashboard by navigating to the **Public IP of your EC2 instance** in your web browser (ensure port 80 is open in your AWS Security Group).

As you drain nodes and upgrade components:
1. Observe the "Node Name" in the dashboard change as pods are rescheduled.
2. Monitor the "Live" pulse to ensure zero-downtime during the rolling process.
3. Verify the final versioning across all nodes once the process is complete.

## Local Development
To run the application locally for testing:
1. Install dependencies:
   npm install
2. Start the server:
   npm start
3. Access the dashboard at http://localhost:3000.
