# Fixing CORS 403 Error - MissingAuthenticationTokenException

## Problem

Getting `403 Forbidden` with `MissingAuthenticationTokenException` on OPTIONS requests, even though CORS headers are present.

## Root Cause

The error `MissingAuthenticationTokenException` suggests that:
1. **API Gateway requires authentication** for OPTIONS method, OR
2. **OPTIONS method is not configured** in API Gateway (API Gateway returns 403 by default)

## Solution

### Option 1: Configure OPTIONS Method in API Gateway (Recommended)

1. **Go to API Gateway Console**
2. **Select your API** (`9mho2wb0jc`)
3. **Navigate to the resource** (`fetch-device-shadow-state` or `/fetch/fetch-device-shadow-state`)
4. **Check if OPTIONS method exists:**
   - If it doesn't exist, create it:
     - Click **Actions** → **Create Method** → Select **OPTIONS**
     - Integration type: **Mock**
     - Integration Request:
       - Integration type: `Mock`
       - Integration Response:
         - Status Code: `200`
         - Header Mappings:
           - `Access-Control-Allow-Origin`: `'*'`
           - `Access-Control-Allow-Methods`: `'POST,OPTIONS,GET'`
           - `Access-Control-Allow-Headers`: `'Content-Type'`
     - Method Response:
       - Status Code: `200`
       - Add Response Headers:
         - `Access-Control-Allow-Origin`
         - `Access-Control-Allow-Methods`
         - `Access-Control-Allow-Headers`
   - If it exists, check its configuration:
     - Make sure **Authorization** is set to **NONE** (not AWS_IAM or other)
     - Make sure it has a Mock integration

5. **Deploy the API:**
   - Click **Actions** → **Deploy API**
   - Stage: `default`
   - Click **Deploy**

### Option 2: Use "Enable CORS" Feature

1. **Go to API Gateway Console**
2. **Select your API** (`9mho2wb0jc`)
3. **Navigate to the resource**
4. **Click Actions** → **Enable CORS**
5. **Configure:**
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - Access-Control-Allow-Methods: `POST,OPTIONS,GET`
6. **Click "Enable CORS and replace existing CORS headers"**
7. **Deploy the API**

### Option 3: Fix Resource Path Mismatch

**Important**: Check if there's a path mismatch:

- API Gateway shows: `/fetch/fetch-device-shadow-state`
- Frontend calls: `/default/fetch-device-shadow-state` (which maps to resource `/fetch-device-shadow-state`)

**If paths don't match:**
1. Either update the frontend URL to match API Gateway resource path
2. Or create/update the API Gateway resource to match the frontend URL

## Verification

After fixing, test with:

```bash
curl -X OPTIONS \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -v
```

**Expected Response:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST,OPTIONS,GET
Access-Control-Allow-Headers: Content-Type
```

**NOT:**
```
HTTP/1.1 403 Forbidden
x-amzn-errortype: MissingAuthenticationTokenException
```

## Common Issues

1. **OPTIONS method doesn't exist**: API Gateway returns 403 by default
2. **OPTIONS method requires auth**: Set Authorization to NONE
3. **Path mismatch**: Resource path doesn't match frontend URL
4. **API not deployed**: Changes won't take effect until deployed

## Quick Checklist

- [ ] OPTIONS method exists for the resource
- [ ] OPTIONS method has Authorization: NONE
- [ ] OPTIONS method has Mock integration
- [ ] CORS headers are configured
- [ ] API is deployed to the correct stage
- [ ] Resource path matches frontend URL

