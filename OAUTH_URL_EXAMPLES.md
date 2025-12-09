# OAuth Authorization URL Examples

## Your Current Configuration

**Tenant ID**: `f2d4e35c-26b7-4735-a69c-995eab185c70`
**Client ID**: `c52dfc52-724c-4f67-8e2a-23da15c5b324`
**Redirect URI**: `http://localhost:5173/auth/callback`
**Scopes**: `User.Read`, `Chat.Read`, `ChatMessage.Read`

---

## 1. Standard User Consent URL (Current - Recommended)

**Use when**: Normal user authentication, letting Azure decide consent flow

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback&response_mode=query&scope=User.Read%20Chat.Read%20ChatMessage.Read&state=RANDOM_STATE_HERE
```

**Behavior**:
- If user has already consented → Skips consent screen
- If user hasn't consented → Shows consent screen
- If tenant requires admin consent → Shows "Need admin approval" error
- **This is what you're currently using** ✅

**URL Decoded**:
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
  client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&
  response_type=code&
  redirect_uri=http://localhost:5173/auth/callback&
  response_mode=query&
  scope=User.Read Chat.Read ChatMessage.Read&
  state=RANDOM_STATE_HERE
```

---

## 2. Force Account Selection (Recommended for Multi-Account Users)

**Use when**: Users might have multiple Microsoft accounts

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback&response_mode=query&scope=User.Read%20Chat.Read%20ChatMessage.Read&prompt=select_account&state=RANDOM_STATE_HERE
```

**Behavior**:
- Always shows account picker
- User can switch between work/school and personal accounts
- Good UX for development/testing

**URL Decoded**:
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
  client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&
  response_type=code&
  redirect_uri=http://localhost:5173/auth/callback&
  response_mode=query&
  scope=User.Read Chat.Read ChatMessage.Read&
  prompt=select_account&
  state=RANDOM_STATE_HERE
```

---

## 3. Force Consent Screen (Use for Testing)

**Use when**: Testing consent flow, debugging permission issues

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback&response_mode=query&scope=User.Read%20Chat.Read%20ChatMessage.Read&prompt=consent&state=RANDOM_STATE_HERE
```

**Behavior**:
- Always shows consent screen, even if previously consented
- User must re-approve permissions
- ⚠️ Can be annoying in production

**URL Decoded**:
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
  client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&
  response_type=code&
  redirect_uri=http://localhost:5173/auth/callback&
  response_mode=query&
  scope=User.Read Chat.Read ChatMessage.Read&
  prompt=consent&
  state=RANDOM_STATE_HERE
```

---

## 4. Admin Consent URL (For IT Administrator)

**Use when**: Requesting tenant-wide admin consent

```
https://login.microsoftonline.com/f2d4e35c-26b7-4735-a69c-995eab185c70/v2.0/adminconsent?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback
```

**Key Differences**:
- Uses **tenant-specific** endpoint (not `/common`)
- Uses `/adminconsent` endpoint (not `/authorize`)
- **Only works if logged in as admin**
- Grants consent for entire organization

**URL Decoded**:
```
https://login.microsoftonline.com/f2d4e35c-26b7-4735-a69c-995eab185c70/v2.0/adminconsent?
  client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&
  redirect_uri=http://localhost:5173/auth/callback
```

**What Admin Sees**:
1. Clear description: "MyTeamsMentionFetcher wants to access your organization's data"
2. List of all requested permissions
3. "Accept" button
4. After accepting, ALL users in ByteRidge can use your app

---

## 5. Tenant-Specific User Auth (Alternative)

**Use when**: Only authenticating users from your specific organization

```
https://login.microsoftonline.com/f2d4e35c-26b7-4735-a69c-995eab185c70/oauth2/v2.0/authorize?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback&response_mode=query&scope=User.Read%20Chat.Read%20ChatMessage.Read&state=RANDOM_STATE_HERE
```

**Behavior**:
- Only ByteRidge users can sign in
- Personal Microsoft accounts are rejected
- More secure for internal apps

**URL Decoded**:
```
https://login.microsoftonline.com/f2d4e35c-26b7-4735-a69c-995eab185c70/oauth2/v2.0/authorize?
  client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&
  response_type=code&
  redirect_uri=http://localhost:5173/auth/callback&
  response_mode=query&
  scope=User.Read Chat.Read ChatMessage.Read&
  state=RANDOM_STATE_HERE
```

---

## 6. No Consent Required (Offline Access)

**Use when**: Requesting refresh tokens for long-term access

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback&response_mode=query&scope=offline_access%20User.Read%20Chat.Read%20ChatMessage.Read&state=RANDOM_STATE_HERE
```

**Additional Scope**: `offline_access`

**Behavior**:
- Returns refresh token in addition to access token
- Refresh token can be used to get new access tokens without re-authentication
- Useful for background tasks or long-running sessions

---

## Prompt Parameter Options

| Parameter | Behavior | Use Case |
|-----------|----------|----------|
| (none) | Smart default - skips consent if already granted | ✅ **Production (Recommended)** |
| `prompt=none` | Never shows UI, fails if interaction needed | Headless/background auth |
| `prompt=login` | Forces user to re-enter credentials | Security-critical operations |
| `prompt=select_account` | Shows account picker | Multi-account scenarios |
| `prompt=consent` | Forces consent screen | Testing, permission changes |
| `prompt=admin_consent` | ❌ **Requires admin**, grants tenant-wide | Admin pre-approval only |

---

## Common OAuth Errors

### Error: "Need admin approval"
**URL Parameter Check**: Make sure you're NOT using `prompt=admin_consent`
**Root Cause**: Tenant has restricted user consent
**Solution**: Request admin consent via admin consent URL

### Error: "AADSTS50105: The signed in user is not assigned to a role"
**URL Parameter Check**: Using tenant-specific endpoint when app requires user assignment
**Solution**: Admin must assign users to the app or disable "User assignment required"

### Error: "AADSTS65004: User declined to consent"
**URL Parameter Check**: Using `prompt=consent` too aggressively
**Solution**: Only force consent when necessary

### Error: "AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type"
**Configuration Issue**: Redirect URI platform type mismatch
**Solution**: Ensure redirect URI is registered under correct platform type

---

## Recommended Implementation

### Update your `teams.py` to add optional prompt parameter:

```python
@router.get("/auth/url", response_model=AuthUrlResponse)
async def get_auth_url(
    prompt: Optional[str] = Query(None, regex="^(select_account|consent|login)$")
):
    """
    Generate Microsoft OAuth authorization URL.

    Args:
        prompt: Optional prompt parameter (select_account, consent, login)
    """
    if not teams_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Teams integration not configured."
        )

    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True

    scopes = ["User.Read", "Chat.Read", "ChatMessage.Read"]
    scope_string = ' '.join(scopes)

    # Build base URL
    auth_url = (
        f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
        f"client_id={settings.MS_GRAPH_CLIENT_ID}&"
        f"response_type=code&"
        f"redirect_uri={quote(settings.MS_GRAPH_REDIRECT_URI, safe='')}&"
        f"response_mode=query&"
        f"scope={quote(scope_string, safe='')}&"
        f"state={state}"
    )

    # Add prompt parameter if provided
    if prompt:
        auth_url += f"&prompt={prompt}"

    return AuthUrlResponse(auth_url=auth_url, state=state)
```

### Frontend usage:

```typescript
// Standard auth (recommended)
const authData = await teamsApi.getAuthUrl();

// Force account selection
const authData = await teamsApi.getAuthUrl({ prompt: 'select_account' });

// Force consent (for testing)
const authData = await teamsApi.getAuthUrl({ prompt: 'consent' });
```

---

## Testing Checklist

- [ ] Test with current URL (no prompt parameter)
- [ ] Test with `prompt=select_account` for account switching
- [ ] Verify no `prompt=admin_consent` in user-facing URLs
- [ ] Test both `/common` and tenant-specific endpoints
- [ ] Confirm redirect URI matches exactly (including protocol, port, path)
- [ ] Test with different user accounts (admin vs regular user)
- [ ] Verify state parameter is properly validated on callback

---

## Quick Reference: Your Endpoints

### For Regular Users (Current):
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize
```

### For Admin Consent Request:
```
https://login.microsoftonline.com/f2d4e35c-26b7-4735-a69c-995eab185c70/v2.0/adminconsent
```

### For Token Exchange:
```
https://login.microsoftonline.com/common/oauth2/v2.0/token
```

---

## Next Steps

1. ✅ **Your current OAuth URL is correct** - No changes needed
2. ⚠️ **The issue is organizational policy**, not your code
3. 📧 **Send admin consent URL to IT admin**:
   ```
   https://login.microsoftonline.com/f2d4e35c-26b7-4735-a69c-995eab185c70/v2.0/adminconsent?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324
   ```
4. ⏳ **Wait for admin to approve**
5. 🎉 **Users can then authenticate normally**

**Alternative for immediate testing**: Use Microsoft 365 Developer account where you have admin rights.
