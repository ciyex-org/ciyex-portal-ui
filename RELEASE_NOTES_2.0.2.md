# Release Notes: 2.0.2 (2026-01-29)

**General Availability Release**

## Overview
This is the General Availability (GA) release of version 2.0.2 of the Ciyex Portal UI application.

## Features & Improvements

### DevOps & Infrastructure
- **ArgoCD Integration**: Added comprehensive GitOps deployment with ArgoCD
  - Three environments: development, staging, production
  - Automated sync from Git repository
  - Self-healing deployments
  
- **Enhanced CI/CD Pipeline**: 
  - New workflow action "Deploy ArgoCD Apps" 
  - Kubernetes manifests for all environments
  - Automated image builds and deployments
  
- **Container Registry**: Updated to use private registry `registry.apps-prod.us-east.in.hinisoft.com`
  - Proper authentication with imagePullSecrets
  - Environment-specific image tags (dev: 2.0.2-alpha.14, stage: 2.0.2-rc, prod: 2.0.2)

## Technical Changes

### Kubernetes Configuration
- Added base deployment in `k8s/base/deployment.yaml`
- Environment-specific overlays in `k8s/overlays/{dev,stage,prod}`
- Kustomize-based configuration management
- Ingress configuration for each environment

### CI/CD Workflow Improvements  
- Fixed YAML indentation in promote-ga job
- Made promote jobs idempotent (skip existing tags/missing inputs)
- Improved notification system with correct version display
- Enhanced error handling and validation

## Bug Fixes
- Fixed if-else logic for version extraction in notifications
- Corrected version display in promotion notifications  
- Fixed kustomize image name format for proper image transformations

## Deployment Environments

### Development
- **URL**: https://ciyex-portal.apps-dev.in.hinisoft.com/
- **Image**: registry.apps-prod.us-east.in.hinisoft.com/ciyex-portal-ui:2.0.2-alpha.14
- **Replicas**: 1

### Staging  
- **URL**: https://ciyex-portal.apps-stage.in.hinisoft.com/
- **Image**: registry.apps-prod.us-east.in.hinisoft.com/ciyex-portal-ui:2.0.2-rc
- **Replicas**: 1

### Production
- **URL**: https://ciyex-portal.apps-prod.in.hinisoft.com/
- **Image**: registry.apps-prod.us-east.in.hinisoft.com/ciyex-portal-ui:2.0.2
- **Replicas**: 2

## Commits Since 2.0.2-alpha.12
- feat: add Deploy ArgoCD Apps workflow action
- feat: add ArgoCD applications for dev/stage/prod environments  
- fix: correct YAML indentation in promote-ga job
- chore(ci): make promote jobs idempotent (skip existing tags/missing inputs)
- fix: Correct if-else logic for version extraction in notifications
- fix: Show correct version in promotion notifications
- feat: Enable notifications for RC and GA promotions
- feat: add imagePullSecrets for private registry
- fix: correct kustomize image name format for dev/stage/prod

## Breaking Changes
None in this release.

## Migration Notes
- Ensure registry credentials are configured in target Kubernetes clusters
- Update any external references to use new ingress URLs
- ArgoCD applications will automatically deploy when synced

## Support
For issues or questions about this release, please contact the development team.