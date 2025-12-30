# API URL Verification

## Current Configuration

### Dashboard.tsx
- `SHADOW_STATE_API_URL`: `https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/fetch-device-shadow-state`
- `SHADOW_UPDATE_API_URL`: `https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/update-device-shadow`

### DashboardCommands.tsx
- `SHADOW_STATE_API_URL`: `https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/fetch-device-shadow-state`
- `SHADOW_UPDATE_API_URL`: `https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/update-device-shadow`

## API Gateway Resource Paths

Based on your API Gateway configuration:
- Resource path: `/fetch/fetch-device-shadow-state`
- Resource path: `/fetch/update-device-shadow`

## URL Structure

The full URL format is:
```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/{resource-path}
```

So:
- `https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/fetch-device-shadow-state`
  - Stage: `default`
  - Resource path: `/fetch/fetch-device-shadow-state` ✅

- `https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/update-device-shadow`
  - Stage: `default`
  - Resource path: `/fetch/update-device-shadow` ✅

## Verification

Both files now have matching URLs that correspond to your API Gateway resource paths.

## Next Steps

1. **Ensure OPTIONS method exists** in API Gateway for both resources
2. **Set Authorization to NONE** for OPTIONS methods
3. **Deploy the API** after configuring CORS
4. **Test the endpoints** to verify CORS works

