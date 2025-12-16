# CORS 403 Error Fix

## Problem
Getting `403 Forbidden` on OPTIONS (CORS preflight) requests to Lambda functions.

## Solution

### Option 1: Fix in API Gateway (Recommended)

1. **Go to API Gateway Console**
2. **Select your API** (`9mho2wb0jc`)
3. **For each resource** (`fetch-device-shadow-state`, `update-device-shadow`, `send-command`):
   - Click on the resource
   - Click on **Actions** → **Enable CORS**
   - Configure:
     - **Access-Control-Allow-Origin**: `*` (or your specific domain)
     - **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
     - **Access-Control-Allow-Methods**: `POST,OPTIONS,GET`
   - Click **Enable CORS and replace existing CORS headers**
   - **Deploy the API** (Actions → Deploy API)

### Option 2: Add OPTIONS Method in API Gateway

1. **For each resource**:
   - Click on the resource
   - Click **Actions** → **Create Method** → Select **OPTIONS**
   - Integration type: **Mock**
   - Integration Response:
     - Status Code: `200`
     - Headers:
       - `Access-Control-Allow-Origin`: `*`
       - `Access-Control-Allow-Methods`: `POST,OPTIONS,GET`
       - `Access-Control-Allow-Headers`: `Content-Type`
   - Method Response:
     - Add Response Headers:
       - `Access-Control-Allow-Origin`
       - `Access-Control-Allow-Methods`
       - `Access-Control-Allow-Headers`
   - **Deploy the API**

### Option 3: Lambda Function Already Handles OPTIONS

The Lambda functions already handle OPTIONS requests correctly. The issue is that API Gateway is blocking the request before it reaches Lambda.

**Quick Fix**: Enable CORS in API Gateway (Option 1 above).

## Verification

After enabling CORS, test with:

```bash
# Test OPTIONS request
curl -X OPTIONS \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -v
```

Expected response:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST,OPTIONS,GET
Access-Control-Allow-Headers: Content-Type
```

## Common Issues

1. **API Gateway not deployed**: After enabling CORS, you MUST deploy the API
2. **Wrong stage**: Make sure you're deploying to the correct stage (`default`)
3. **Cached responses**: Clear browser cache after fixing CORS

