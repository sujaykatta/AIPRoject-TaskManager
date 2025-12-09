# Admin Consent Troubleshooting Checklist

## 1. Check Tenant-Wide User Consent Settings

**Location**: Azure Portal → Enterprise Applications → User Settings

### Steps:
1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** (or **Microsoft Entra ID**)
3. Click **Enterprise Applications** in the left sidebar
4. Click **User Settings**
5. Look for **User consent settings** section

### What to Check:
- **"Users can consent to apps accessing company data on their behalf"**
  - ✅ **Enabled** = Users can consent to low-risk permissions
  - ❌ **Disabled** = All apps require admin consent (LIKELY YOUR ISSUE)

- **"Users can consent to apps accessing company data for the groups they own"**
  - Similar setting for group-owned resources

### Fix:
If disabled, you have two options:
- **Option A**: Ask IT admin to enable user consent for verified publishers or selected permissions
- **Option B**: Ask IT admin to grant tenant-wide admin consent for your specific app

---

## 2. Check App Registration Permissions

**Location**: Azure Portal → App Registrations → API Permissions

### Steps:
1. Go to **App Registrations**
2. Find your app: `MyTeamsMentionFetcher` (Client ID: c52dfc52-724c-4f67-8e2a-23da15c5b324)
3. Click **API Permissions**

### What to Verify:
- [ ] Only these 3 permissions are listed:
  - `User.Read` (Delegated)
  - `Chat.Read` (Delegated)
  - `ChatMessage.Read` (Delegated)
- [ ] No Application permissions are present
- [ ] "Admin consent required" column shows **No** for all
- [ ] Status column shows **Not granted for [Your Org]**

### Warning Signs:
- ⚠️ Additional permissions you didn't add
- ⚠️ Any "Application" type permissions
- ⚠️ Green checkmarks in "Status" column (means admin already granted consent)

---

## 3. Request Admin Consent (Recommended Solution)

Since ByteRidge likely has restricted user consent, the cleanest solution is to request admin consent.

### Option A: Admin Uses Consent URL
Send this URL to your IT administrator:

```
https://login.microsoftonline.com/f2d4e35c-26b7-4735-a69c-995eab185c70/v2.0/adminconsent?client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324
```

**What happens:**
1. Admin clicks the link
2. Admin sees the consent screen showing all permissions
3. Admin clicks "Accept"
4. Consent is granted for ALL users in the organization
5. Regular users can now use the app without admin approval

### Option B: Admin Grants Consent in Portal
1. Admin goes to **Enterprise Applications**
2. Searches for `MyTeamsMentionFetcher`
3. Clicks **Permissions**
4. Clicks **Grant admin consent for [Organization]**

---

## 4. Check for Conditional Access Policies

**Location**: Azure Portal → Security → Conditional Access

### Steps:
1. Go to **Azure Active Directory**
2. Click **Security** → **Conditional Access**
3. Review policies

### What to Look For:
- Policies that require MFA for certain apps
- Policies that block third-party apps
- Policies specific to Teams or Graph API access

---

## 5. Verify Redirect URI Configuration

### In Azure App Registration:
1. Go to **Authentication** blade
2. Verify redirect URI: `http://localhost:5173/auth/callback`
3. Make sure it's listed under **Single-page application** or **Web** platform
4. Ensure no typos or extra spaces

### In Your Code:
Check `.env` file has:
```
MS_GRAPH_REDIRECT_URI=http://localhost:5173/auth/callback
```

---

## 6. Check Enterprise Application Consent Settings

**Location**: Azure Portal → Enterprise Applications → [Your App]

### Steps:
1. Go to **Enterprise Applications**
2. Search for your app by name or client ID
3. If it exists, click on it
4. Check **Properties**

### Settings to Verify:
- **Enabled for users to sign in?** → Should be **Yes**
- **User assignment required?** → Should be **No** (unless you want to restrict access)
- **Visible to users?** → Should be **Yes**

---

## 7. Test with Different OAuth Parameters

### Current URL (No Prompt):
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
  client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&
  response_type=code&
  redirect_uri=http://localhost:5173/auth/callback&
  response_mode=query&
  scope=User.Read Chat.Read ChatMessage.Read&
  state=<random_state>
```

### Try with `prompt=select_account`:
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
  client_id=c52dfc52-724c-4f67-8e2a-23da15c5b324&
  response_type=code&
  redirect_uri=http://localhost:5173/auth/callback&
  response_mode=query&
  scope=User.Read Chat.Read ChatMessage.Read&
  prompt=select_account&
  state=<random_state>
```

**Note**: Do NOT use `prompt=admin_consent` unless you specifically want to force admin consent.

---

## Quick Diagnosis

Run through these questions:

1. **Can you consent to OTHER third-party apps in your organization?**
   - ✅ Yes → Problem is specific to your app or permissions
   - ❌ No → Tenant has restricted user consent (most likely)

2. **Are you a Global Administrator in your tenant?**
   - ✅ Yes → You can grant admin consent yourself
   - ❌ No → You need to contact IT admin

3. **Is this app for personal use or team-wide use?**
   - Personal → Ask for consent just for your account
   - Team-wide → Request tenant-wide admin consent

4. **Are you testing or deploying to production?**
   - Testing → Use Microsoft 365 Developer account instead
   - Production → Request proper admin consent

---

## Workarounds for Development

### Workaround 1: Use Microsoft 365 Developer Account
1. Sign up for free: https://developer.microsoft.com/microsoft-365/dev-program
2. Get a developer tenant with admin access
3. Test your app there without organizational restrictions

### Workaround 2: Use Personal Microsoft Account
- If your app supports both work and personal accounts (`/common` endpoint)
- Test with personal account (outlook.com, hotmail.com)
- No admin consent required for personal accounts

### Workaround 3: Become Admin of Your App's Tenant
- If you're the app owner, ensure you're testing in a tenant where you have admin rights

---

## Expected Outcomes

### If User Consent is Enabled:
- User sees simple consent screen
- User clicks "Accept"
- Token is immediately issued
- No admin involvement needed

### If Admin Consent is Required:
- User sees "Need admin approval" message
- User must request admin to approve
- Admin grants consent once
- All users can then use the app

### After Admin Consent is Granted:
- Original consent screen won't appear again for any user
- Users seamlessly authenticate
- App works normally

---

## Summary of Most Likely Issue

Based on the error message you shared earlier:
> "MyTeamsMentionFetcher needs permission to access resources in your organization that only an admin can grant"

**Root Cause**: ByteRidge organization has **disabled user consent for third-party applications**.

**Solution**: Contact your IT administrator and request tenant-wide admin consent for your app using the admin consent URL provided above.

**Alternative**: Use Microsoft 365 Developer account for testing where you have full admin rights.
