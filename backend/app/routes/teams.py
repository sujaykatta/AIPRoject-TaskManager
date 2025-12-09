"""
Teams Integration Routes

Endpoints for fetching and processing Microsoft Teams mentions.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime
import secrets
import httpx
from urllib.parse import quote

from app.services.teams_service import teams_service, TeamsMention, TeamsServiceError
from app.core.config import settings


router = APIRouter(prefix="/teams", tags=["teams"])


class MentionResponse(BaseModel):
    """Response model for a single Teams mention."""
    id: str
    message_text: str
    sender_name: str
    sender_email: Optional[str] = None
    chat_name: Optional[str] = None
    channel_name: Optional[str] = None
    team_name: Optional[str] = None
    timestamp: datetime
    web_url: Optional[str] = None
    is_from_channel: bool = False
    # New metadata fields
    chat_type: Optional[str] = None
    chat_id: Optional[str] = None
    requested_by: Optional[str] = None
    requested_at: Optional[datetime] = None
    graph_metadata: Optional[dict] = None
    # Status field
    status: Optional[str] = "Open"


class MentionsResponse(BaseModel):
    """Response model for fetching mentions."""
    mentions: List[MentionResponse]
    count: int
    is_mock_data: bool = False
    message: Optional[str] = None


class TeamsStatusResponse(BaseModel):
    """Response model for Teams integration status."""
    is_configured: bool
    message: str


@router.get("/status", response_model=TeamsStatusResponse)
async def get_teams_status():
    """
    Check if Microsoft Teams integration is properly configured.

    Returns configuration status and helpful message.
    """
    is_configured = teams_service.is_configured

    if is_configured:
        message = "Microsoft Teams integration is configured and ready."
    else:
        message = (
            "Microsoft Teams integration is not configured. "
            "Please set MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, and MS_GRAPH_TENANT_ID "
            "environment variables. Using mock data for demo purposes."
        )

    return TeamsStatusResponse(is_configured=is_configured, message=message)


@router.get("/mentions", response_model=MentionsResponse)
async def get_mentions(
    limit: int = Query(default=5, ge=1, le=20, description="Maximum number of mentions to fetch")
):
    """
    Fetch Teams messages where the current user is @mentioned.

    This endpoint retrieves recent messages from Teams chats and channels
    where the authenticated user has been mentioned.

    Args:
        limit: Maximum number of mentions to return (1-20, default: 5)

    Returns:
        MentionsResponse containing list of mentions with metadata
    """
    try:
        mentions = await teams_service.get_my_mentions(limit=limit)

        # Convert TeamsMention objects to response format
        mention_responses = [
            MentionResponse(
                id=m.id,
                message_text=m.message_text,
                sender_name=m.sender_name,
                sender_email=m.sender_email,
                chat_name=m.chat_name,
                channel_name=m.channel_name,
                team_name=m.team_name,
                timestamp=m.timestamp,
                web_url=m.web_url,
                is_from_channel=m.is_from_channel,
                chat_type=m.chat_type,
                chat_id=m.chat_id,
                requested_by=m.requested_by,
                requested_at=m.requested_at,
                graph_metadata=m.graph_metadata,
            )
            for m in mentions
        ]

        is_mock = not teams_service.is_configured

        return MentionsResponse(
            mentions=mention_responses,
            count=len(mention_responses),
            is_mock_data=is_mock,
            message="Using mock data for demo - configure Graph API credentials for real data" if is_mock else None,
        )

    except TeamsServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[TEAMS API] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch Teams mentions. Please try again later."
        )


# In-memory store for OAuth state (in production, use Redis or database)
_oauth_states = {}


class AuthUrlResponse(BaseModel):
    """Response model for OAuth auth URL."""
    auth_url: str
    state: str


class TokenExchangeRequest(BaseModel):
    """Request model for token exchange."""
    code: str
    state: str


class TokenResponse(BaseModel):
    """Response model for access token."""
    access_token: str
    expires_in: int
    token_type: str


@router.get("/auth/url", response_model=AuthUrlResponse)
async def get_auth_url():
    """
    Generate Microsoft OAuth authorization URL for user to sign in.

    This initiates the OAuth flow by returning a URL that the frontend
    should redirect the user to for Microsoft sign-in.
    """
    if not teams_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Teams integration not configured. Please set MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, and MS_GRAPH_TENANT_ID."
        )

    # Generate random state for CSRF protection
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True

    # Build authorization URL
    # Using only User.Read which never requires admin consent
    scopes = [
        "User.Read",
    ]

    # Properly URL-encode the redirect URI and scopes
    scope_string = ' '.join(scopes)

    # Use tenant-specific endpoint for single-tenant app
    # Add prompt=login to force fresh auth and bypass cached consent
    auth_url = (
        f"https://login.microsoftonline.com/{settings.MS_GRAPH_TENANT_ID}/oauth2/v2.0/authorize?"
        f"client_id={settings.MS_GRAPH_CLIENT_ID}&"
        f"response_type=code&"
        f"redirect_uri={quote(settings.MS_GRAPH_REDIRECT_URI, safe='')}&"
        f"response_mode=query&"
        f"scope={quote(scope_string, safe='')}&"
        f"prompt=login&"
        f"state={state}"
    )

    return AuthUrlResponse(auth_url=auth_url, state=state)


@router.post("/auth/token", response_model=TokenResponse)
async def exchange_token(request: TokenExchangeRequest):
    """
    Exchange authorization code for access token.

    After user authorizes, frontend receives a code which this endpoint
    exchanges for an access token to make Graph API calls.
    """
    import sys
    print(f"[TEAMS] Token exchange request received - state: {request.state}, code: {request.code[:20]}...", file=sys.stderr, flush=True)
    print(f"[TEAMS] Valid states in memory: {list(_oauth_states.keys())}", file=sys.stderr, flush=True)

    # Verify state to prevent CSRF
    if request.state not in _oauth_states:
        print(f"[TEAMS] State validation FAILED - state not found", file=sys.stderr, flush=True)
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Remove used state
    print(f"[TEAMS] State validated successfully, removing from memory", file=sys.stderr, flush=True)
    del _oauth_states[request.state]

    if not teams_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Teams integration not configured"
        )

    # Exchange code for token - use tenant-specific endpoint
    token_url = f"https://login.microsoftonline.com/{settings.MS_GRAPH_TENANT_ID}/oauth2/v2.0/token"
    print(f"[TEAMS] Exchanging code with Microsoft at: {token_url}", file=sys.stderr, flush=True)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "client_id": settings.MS_GRAPH_CLIENT_ID,
                "client_secret": settings.MS_GRAPH_CLIENT_SECRET,
                "code": request.code,
                "redirect_uri": settings.MS_GRAPH_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        print(f"[TEAMS] Microsoft responded with status: {response.status_code}", file=sys.stderr, flush=True)

        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get('error_description', 'Unknown error')
            error_code = error_data.get('error', 'unknown')
            print(f"[TEAMS] Token exchange failed: {error_code} - {error_msg}", file=sys.stderr, flush=True)
            print(f"[TEAMS] Full error response: {error_data}", file=sys.stderr, flush=True)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange token: {error_msg}"
            )

        token_data = response.json()

        return TokenResponse(
            access_token=token_data["access_token"],
            expires_in=token_data.get("expires_in", 3600),
            token_type=token_data.get("token_type", "Bearer")
        )


@router.get("/mentions/user", response_model=MentionsResponse)
async def get_user_mentions(
    access_token: str = Query(..., description="User's OAuth access token"),
    limit: int = Query(default=25, ge=1, le=100, description="Maximum number of mentions to fetch"),
    users: Optional[str] = Query(None, description="Comma-separated list of user names to filter by"),
    group_chats: Optional[str] = Query(None, description="Comma-separated list of group chat names to filter by"),
    meeting_chats: Optional[str] = Query(None, description="Comma-separated list of meeting chat names to filter by"),
    individual_chats: Optional[str] = Query(None, description="Comma-separated list of individual chat names to filter by")
):
    """
    Fetch Teams messages where the authenticated user is @mentioned using their access token.

    This endpoint uses the user's access token from OAuth to fetch their personal mentions.
    Supports filtering by users, group chats, meeting chats, and individual chats.

    Args:
        access_token: Bearer token from OAuth flow
        limit: Maximum number of mentions to return (1-100, default: 25)
        users: Optional comma-separated list of sender names
        group_chats: Optional comma-separated list of group chat names
        meeting_chats: Optional comma-separated list of meeting chat names
        individual_chats: Optional comma-separated list of individual chat names

    Returns:
        MentionsResponse containing list of mentions with metadata
    """
    try:
        mentions = await teams_service.get_my_mentions_with_token(access_token, limit=limit)

        # Apply filters if provided
        if users or group_chats or meeting_chats or individual_chats:
            user_list = [u.strip() for u in users.split(",")] if users else []
            group_list = [g.strip() for g in group_chats.split(",")] if group_chats else []
            meeting_list = [m.strip() for m in meeting_chats.split(",")] if meeting_chats else []
            individual_list = [i.strip() for i in individual_chats.split(",")] if individual_chats else []

            filtered_mentions = []
            for m in mentions:
                # Filter by user
                if user_list and m.sender_name not in user_list:
                    continue

                # Filter by chat type and name
                if m.chat_type == "group" and group_list:
                    if m.chat_name not in group_list and (not m.is_from_channel or f"{m.team_name}/{m.channel_name}" not in group_list):
                        continue
                elif m.chat_type == "meeting" and meeting_list:
                    if m.chat_name not in meeting_list:
                        continue
                elif m.chat_type == "individual" and individual_list:
                    if m.chat_name not in individual_list:
                        continue

                # If chat type specific filters exist but this doesn't match any, skip
                if (group_list and m.chat_type != "group") and \
                   (meeting_list and m.chat_type != "meeting") and \
                   (individual_list and m.chat_type != "individual"):
                    if group_list or meeting_list or individual_list:
                        continue

                filtered_mentions.append(m)

            mentions = filtered_mentions

        # Convert TeamsMention objects to response format
        mention_responses = [
            MentionResponse(
                id=m.id,
                message_text=m.message_text,
                sender_name=m.sender_name,
                sender_email=m.sender_email,
                chat_name=m.chat_name,
                channel_name=m.channel_name,
                team_name=m.team_name,
                timestamp=m.timestamp,
                web_url=m.web_url,
                is_from_channel=m.is_from_channel,
                chat_type=m.chat_type,
                chat_id=m.chat_id,
                requested_by=m.requested_by,
                requested_at=m.requested_at,
                graph_metadata=m.graph_metadata,
            )
            for m in mentions
        ]

        return MentionsResponse(
            mentions=mention_responses,
            count=len(mention_responses),
            is_mock_data=False,
            message=None,
        )

    except TeamsServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[TEAMS API] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch Teams mentions. Please try again later."
        )


@router.get("/mentions/demo", response_model=MentionsResponse)
async def get_demo_mentions(
    limit: int = Query(default=25, ge=1, le=100, description="Maximum number of mentions to fetch"),
    users: Optional[str] = Query(None, description="Comma-separated list of user names to filter by"),
    group_chats: Optional[str] = Query(None, description="Comma-separated list of group chat names to filter by"),
    meeting_chats: Optional[str] = Query(None, description="Comma-separated list of meeting chat names to filter by"),
    individual_chats: Optional[str] = Query(None, description="Comma-separated list of individual chat names to filter by")
):
    """
    Get demo/mock Teams mentions without requiring authentication.

    This endpoint bypasses OAuth and returns realistic fake data for development and testing.
    Perfect for UI testing when you don't have admin access to grant consent.
    Supports filtering by users, group chats, meeting chats, and individual chats.

    Args:
        limit: Maximum number of mentions to return (1-100, default: 25)
        users: Optional comma-separated list of sender names
        group_chats: Optional comma-separated list of group chat names
        meeting_chats: Optional comma-separated list of meeting chat names
        individual_chats: Optional comma-separated list of individual chat names

    Returns:
        MentionsResponse containing mock mentions with metadata
    """
    # Get mock mentions from the service
    mentions = teams_service._get_mock_mentions(limit=limit)

    # Apply filters if provided
    if users or group_chats or meeting_chats or individual_chats:
        user_list = [u.strip() for u in users.split(",")] if users else []
        group_list = [g.strip() for g in group_chats.split(",")] if group_chats else []
        meeting_list = [m.strip() for m in meeting_chats.split(",")] if meeting_chats else []
        individual_list = [i.strip() for i in individual_chats.split(",")] if individual_chats else []

        filtered_mentions = []
        for m in mentions:
            # Filter by user
            if user_list and m.sender_name not in user_list:
                continue

            # Filter by chat type and name
            if m.chat_type == "group" and group_list:
                if m.chat_name not in group_list and (not m.is_from_channel or f"{m.team_name}/{m.channel_name}" not in group_list):
                    continue
            elif m.chat_type == "meeting" and meeting_list:
                if m.chat_name not in meeting_list:
                    continue
            elif m.chat_type == "individual" and individual_list:
                if m.chat_name not in individual_list:
                    continue

            # If chat type specific filters exist but this doesn't match any, skip
            if (group_list and m.chat_type != "group") and \
               (meeting_list and m.chat_type != "meeting") and \
               (individual_list and m.chat_type != "individual"):
                if group_list or meeting_list or individual_list:
                    continue

            filtered_mentions.append(m)

        mentions = filtered_mentions

    # Convert TeamsMention objects to response format
    mention_responses = [
        MentionResponse(
            id=m.id,
            message_text=m.message_text,
            sender_name=m.sender_name,
            sender_email=m.sender_email,
            chat_name=m.chat_name,
            channel_name=m.channel_name,
            team_name=m.team_name,
            timestamp=m.timestamp,
            web_url=m.web_url,
            is_from_channel=m.is_from_channel,
        )
        for m in mentions
    ]

    return MentionsResponse(
        mentions=mention_responses,
        count=len(mention_responses),
        is_mock_data=True,
        message="Using demo data - no authentication required. Configure Graph API for real data.",
    )
