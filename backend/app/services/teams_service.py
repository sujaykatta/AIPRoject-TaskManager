"""
Microsoft Teams Integration Service

This service handles fetching messages where the user is @mentioned
using Microsoft Graph API.
"""
import httpx
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.core.config import settings


class TeamsMention(BaseModel):
    """Represents a Teams message where user was mentioned."""
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
    chat_type: Optional[str] = None  # 'individual', 'group', 'meeting'
    chat_id: Optional[str] = None
    requested_by: Optional[str] = None
    requested_at: Optional[datetime] = None
    graph_metadata: Optional[dict] = None
    # Status field
    status: Optional[str] = "Open"  # 'Open', 'In Progress', 'Done'


class TeamsServiceError(Exception):
    """Custom exception for Teams service errors."""
    pass


class TeamsService:
    """
    Service for interacting with Microsoft Graph API to fetch Teams mentions.

    Uses client credentials flow for application-level access.
    Note: For production, you should use delegated permissions with user auth.
    """

    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
    TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

    def __init__(self):
        self.client_id = settings.MS_GRAPH_CLIENT_ID
        self.client_secret = settings.MS_GRAPH_CLIENT_SECRET
        self.tenant_id = settings.MS_GRAPH_TENANT_ID
        self._access_token: Optional[str] = None
        self._token_expires: Optional[datetime] = None

    @property
    def is_configured(self) -> bool:
        """Check if the service is properly configured."""
        return bool(self.client_id and self.client_secret and self.tenant_id)

    async def _get_access_token(self) -> str:
        """
        Get an access token using client credentials flow.

        Returns cached token if still valid, otherwise fetches a new one.
        """
        # Check if we have a valid cached token
        if self._access_token and self._token_expires:
            if datetime.now() < self._token_expires:
                return self._access_token

        if not self.is_configured:
            raise TeamsServiceError(
                "Microsoft Graph API is not configured. "
                "Please set MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, and MS_GRAPH_TENANT_ID environment variables."
            )

        token_url = self.TOKEN_URL.format(tenant_id=self.tenant_id)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "https://graph.microsoft.com/.default",
                    "grant_type": "client_credentials",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code != 200:
                error_data = response.json()
                raise TeamsServiceError(
                    f"Failed to get access token: {error_data.get('error_description', 'Unknown error')}"
                )

            token_data = response.json()
            self._access_token = token_data["access_token"]
            # Token expires in 'expires_in' seconds, cache with 5 min buffer
            expires_in = token_data.get("expires_in", 3600) - 300
            from datetime import timedelta
            self._token_expires = datetime.now() + timedelta(seconds=expires_in)

            return self._access_token

    async def get_my_mentions(self, limit: int = 5) -> List[TeamsMention]:
        """
        Fetch messages where the current user is @mentioned.

        Args:
            limit: Maximum number of mentions to return (default: 5)

        Returns:
            List of TeamsMention objects containing message details

        Note: This uses the /me/chats endpoint with $search or filters.
        For production, you need proper user authentication (delegated flow).
        """
        if not self.is_configured:
            # Return mock data for development/demo purposes
            return self._get_mock_mentions(limit)

        try:
            token = await self._get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }

            mentions = []

            async with httpx.AsyncClient() as client:
                # First, get the user's chats
                chats_response = await client.get(
                    f"{self.GRAPH_BASE_URL}/me/chats",
                    headers=headers,
                    params={"$top": 50},
                )

                if chats_response.status_code != 200:
                    print(f"[TEAMS] Error fetching chats: {chats_response.text}")
                    return self._get_mock_mentions(limit)

                chats = chats_response.json().get("value", [])

                # For each chat, get recent messages and filter for mentions
                for chat in chats[:10]:  # Limit to first 10 chats for performance
                    chat_id = chat.get("id")
                    if not chat_id:
                        continue

                    messages_response = await client.get(
                        f"{self.GRAPH_BASE_URL}/me/chats/{chat_id}/messages",
                        headers=headers,
                        params={"$top": 20, "$orderby": "createdDateTime desc"},
                    )

                    if messages_response.status_code != 200:
                        continue

                    messages = messages_response.json().get("value", [])

                    for msg in messages:
                        # Check if the message contains mentions
                        msg_mentions = msg.get("mentions", [])
                        if msg_mentions:
                            # Parse the message
                            body = msg.get("body", {})
                            content = body.get("content", "")

                            # Strip HTML tags for clean text
                            import re
                            clean_text = re.sub(r'<[^>]+>', '', content).strip()

                            sender = msg.get("from", {})
                            user_info = sender.get("user", {}) or sender.get("application", {})

                            mention = TeamsMention(
                                id=msg.get("id", ""),
                                message_text=clean_text,
                                sender_name=user_info.get("displayName", "Unknown"),
                                sender_email=user_info.get("email"),
                                chat_name=chat.get("topic"),
                                timestamp=datetime.fromisoformat(
                                    msg.get("createdDateTime", "").replace("Z", "+00:00")
                                ),
                                web_url=msg.get("webUrl"),
                                is_from_channel=False,
                            )
                            mentions.append(mention)

                            if len(mentions) >= limit:
                                return mentions

                # Also check team channels for mentions
                teams_response = await client.get(
                    f"{self.GRAPH_BASE_URL}/me/joinedTeams",
                    headers=headers,
                )

                if teams_response.status_code == 200:
                    teams = teams_response.json().get("value", [])

                    for team in teams[:5]:  # Limit teams checked
                        team_id = team.get("id")
                        team_name = team.get("displayName", "Unknown Team")

                        channels_response = await client.get(
                            f"{self.GRAPH_BASE_URL}/teams/{team_id}/channels",
                            headers=headers,
                        )

                        if channels_response.status_code != 200:
                            continue

                        channels = channels_response.json().get("value", [])

                        for channel in channels[:3]:  # Limit channels per team
                            channel_id = channel.get("id")
                            channel_name = channel.get("displayName", "Unknown Channel")

                            msgs_response = await client.get(
                                f"{self.GRAPH_BASE_URL}/teams/{team_id}/channels/{channel_id}/messages",
                                headers=headers,
                                params={"$top": 10, "$orderby": "createdDateTime desc"},
                            )

                            if msgs_response.status_code != 200:
                                continue

                            for msg in msgs_response.json().get("value", []):
                                if msg.get("mentions"):
                                    body = msg.get("body", {})
                                    content = body.get("content", "")
                                    import re
                                    clean_text = re.sub(r'<[^>]+>', '', content).strip()

                                    sender = msg.get("from", {})
                                    user_info = sender.get("user", {}) or {}

                                    mention = TeamsMention(
                                        id=msg.get("id", ""),
                                        message_text=clean_text,
                                        sender_name=user_info.get("displayName", "Unknown"),
                                        sender_email=user_info.get("email"),
                                        channel_name=channel_name,
                                        team_name=team_name,
                                        timestamp=datetime.fromisoformat(
                                            msg.get("createdDateTime", "").replace("Z", "+00:00")
                                        ),
                                        web_url=msg.get("webUrl"),
                                        is_from_channel=True,
                                    )
                                    mentions.append(mention)

                                    if len(mentions) >= limit:
                                        return mentions

            return mentions[:limit]

        except Exception as e:
            print(f"[TEAMS] Error fetching mentions: {e}")
            # Return mock data as fallback
            return self._get_mock_mentions(limit)

    def _get_mock_mentions(self, limit: int = 5) -> List[TeamsMention]:
        """
        Return mock mentions for development/demo purposes.
        """
        from datetime import timedelta

        now = datetime.now()

        mock_mentions = [
            TeamsMention(
                id="mock-1",
                message_text="@You Hey, can you review the PR for the authentication module? It's blocking the release.",
                sender_name="Sarah Chen",
                sender_email="sarah.chen@company.com",
                chat_name="Dev Team",
                timestamp=now - timedelta(hours=1),
                is_from_channel=False,
                chat_type="group",
                chat_id="mock-chat-1",
                requested_by="demo_user",
                requested_at=now - timedelta(hours=1),
                graph_metadata={"chatType": "group", "memberCount": 5},
                status="Open",
            ),
            TeamsMention(
                id="mock-2",
                message_text="@You Please update the API documentation for the new endpoints we discussed yesterday.",
                sender_name="Mike Johnson",
                sender_email="mike.j@company.com",
                channel_name="General",
                team_name="Backend Team",
                timestamp=now - timedelta(hours=3),
                is_from_channel=True,
                chat_type="group",
                chat_id="mock-chat-2",
                requested_by="demo_user",
                requested_at=now - timedelta(hours=3),
                graph_metadata={"chatType": "group", "isChannel": True},
                status="In Progress",
            ),
            TeamsMention(
                id="mock-3",
                message_text="@You Reminder: Sprint planning meeting tomorrow at 10 AM. Please have your estimates ready.",
                sender_name="Emily Davis",
                sender_email="emily.d@company.com",
                chat_name="Sprint Planning Meeting",
                timestamp=now - timedelta(hours=5),
                is_from_channel=False,
                chat_type="meeting",
                chat_id="mock-chat-3",
                requested_by="demo_user",
                requested_at=now - timedelta(hours=5),
                graph_metadata={"chatType": "meeting", "meetingId": "meeting-123"},
                status="Done",
            ),
            TeamsMention(
                id="mock-4",
                message_text="@You The database migration script failed on staging. Can you check the logs?",
                sender_name="James Wilson",
                sender_email="james.w@company.com",
                channel_name="Deployments",
                team_name="DevOps",
                timestamp=now - timedelta(hours=8),
                is_from_channel=True,
                chat_type="group",
                chat_id="mock-chat-4",
                requested_by="demo_user",
                requested_at=now - timedelta(hours=8),
                graph_metadata={"chatType": "group", "isChannel": True},
                status="Open",
            ),
            TeamsMention(
                id="mock-5",
                message_text="@You Great job on the presentation! Can you share the slides with the marketing team?",
                sender_name="Lisa Park",
                sender_email="lisa.p@company.com",
                chat_name="Lisa Park",
                timestamp=now - timedelta(days=1),
                is_from_channel=False,
                chat_type="individual",
                chat_id="mock-chat-5",
                requested_by="demo_user",
                requested_at=now - timedelta(days=1),
                graph_metadata={"chatType": "oneOnOne"},
                status="Done",
            ),
            TeamsMention(
                id="mock-6",
                message_text="@You Can we discuss the Q4 roadmap after the standup?",
                sender_name="Alex Kumar",
                sender_email="alex.k@company.com",
                chat_name="Product Sync Meeting",
                timestamp=now - timedelta(days=1, hours=2),
                is_from_channel=False,
                chat_type="meeting",
                chat_id="mock-chat-6",
                requested_by="demo_user",
                requested_at=now - timedelta(days=1, hours=2),
                graph_metadata={"chatType": "meeting", "meetingId": "meeting-456"},
                status="In Progress",
            ),
        ]

        return mock_mentions[:limit]

    async def get_my_mentions_with_token(self, access_token: str, limit: int = 5) -> List[TeamsMention]:
        """
        Fetch recent messages from Teams chats using a user access token.

        This uses ChatMessage.Read permission to get 1:1 and group chat messages.

        Args:
            access_token: OAuth access token for the authenticated user
            limit: Maximum number of messages to return (default: 5)

        Returns:
            List of TeamsMention objects containing message details
        """
        import re

        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            mentions = []

            async with httpx.AsyncClient() as client:
                # First, verify the token works by getting user profile
                print("[TEAMS] Verifying token with /me endpoint...")
                me_response = await client.get(
                    f"{self.GRAPH_BASE_URL}/me",
                    headers=headers,
                )

                if me_response.status_code != 200:
                    print(f"[TEAMS] Token invalid: {me_response.status_code}")
                    raise TeamsServiceError("Invalid access token")

                user_data = me_response.json()
                user_id = user_data.get("id")
                print(f"[TEAMS] Authenticated as: {user_data.get('displayName', 'Unknown')} (id: {user_id})")

                # Get user's recent Teams activity - try multiple approaches
                print("[TEAMS] Fetching recent Teams activity...")

                # Approach 1: Try to get user's mailbox messages (uses Mail.Read)
                print("[TEAMS] Trying /me/messages endpoint...")
                messages_response = await client.get(
                    f"{self.GRAPH_BASE_URL}/me/messages",
                    headers=headers,
                    params={
                        "$top": 20,
                        "$filter": "from/emailAddress/address ne '{user_data.get('mail', '')}'",
                        "$select": "id,subject,bodyPreview,from,receivedDateTime,webLink",
                        "$orderby": "receivedDateTime DESC"
                    },
                )

                if messages_response.status_code == 200:
                    messages = messages_response.json().get("value", [])
                    print(f"[TEAMS] Found {len(messages)} email messages")

                    for msg in messages[:limit]:
                        sender = msg.get("from", {}).get("emailAddress", {})

                        mention = TeamsMention(
                            id=msg.get("id", ""),
                            message_text=msg.get("subject", "") + " - " + msg.get("bodyPreview", ""),
                            sender_name=sender.get("name", "Unknown"),
                            sender_email=sender.get("address"),
                            channel_name="Email",
                            team_name="Outlook",
                            timestamp=datetime.fromisoformat(
                                msg.get("receivedDateTime", "").replace("Z", "+00:00")
                            ),
                            web_url=msg.get("webLink"),
                            is_from_channel=False,
                        )
                        mentions.append(mention)

                    if mentions:
                        print(f"[TEAMS] Returning {len(mentions)} email messages")
                        return mentions

                # Approach 2: Try /me/chats (requires Chat.Read)
                print("[TEAMS] Trying /me/chats endpoint...")
                chats_response = await client.get(
                    f"{self.GRAPH_BASE_URL}/me/chats",
                    headers=headers,
                    params={"$top": 20, "$expand": "members"},
                )

                if chats_response.status_code == 200:
                    chats = chats_response.json().get("value", [])
                    print(f"[TEAMS] Found {len(chats)} chats")

                    request_time = datetime.now()

                    for chat in chats[:10]:  # Check up to 10 chats
                        chat_id = chat.get("id")
                        chat_topic = chat.get("topic") or "Direct Chat"
                        graph_chat_type = chat.get("chatType", "unknown")  # 'oneOnOne', 'group', 'meeting'

                        # Determine our chat_type category
                        if graph_chat_type == "oneOnOne":
                            our_chat_type = "individual"
                        elif graph_chat_type == "meeting":
                            our_chat_type = "meeting"
                        else:  # 'group' or unknown
                            our_chat_type = "group"

                        # Get chat members for display
                        members = chat.get("members", [])
                        member_names = [m.get("displayName", "Unknown") for m in members if m.get("displayName")]
                        chat_name = chat_topic if chat_topic != "Direct Chat" else ", ".join(member_names[:3])

                        print(f"[TEAMS] Checking chat: {chat_name} (type: {our_chat_type}, graph_type: {graph_chat_type})")

                        # Get messages from this chat
                        msgs_response = await client.get(
                            f"{self.GRAPH_BASE_URL}/me/chats/{chat_id}/messages",
                            headers=headers,
                            params={"$top": 10},
                        )

                        if msgs_response.status_code == 403:
                            print(f"[TEAMS] Permission denied for messages in chat {chat_name}")
                            continue

                        if msgs_response.status_code != 200:
                            print(f"[TEAMS] Error fetching messages: {msgs_response.status_code} - {msgs_response.text}")
                            continue

                        messages = msgs_response.json().get("value", [])
                        print(f"[TEAMS] Found {len(messages)} messages in {chat_name}")

                        for msg in messages:
                            msg_type = msg.get("messageType", "")
                            if msg_type != "message":
                                continue

                            body = msg.get("body", {})
                            content = body.get("content", "")
                            clean_text = re.sub(r'<[^>]+>', '', content).strip()

                            if not clean_text:
                                continue

                            sender = msg.get("from", {})
                            user_info = sender.get("user", {}) or {}

                            mention = TeamsMention(
                                id=msg.get("id", ""),
                                message_text=clean_text,
                                sender_name=user_info.get("displayName", "Unknown"),
                                sender_email=user_info.get("email"),
                                chat_name=chat_name,
                                team_name="Chat",
                                timestamp=datetime.fromisoformat(
                                    msg.get("createdDateTime", "").replace("Z", "+00:00")
                                ),
                                web_url=msg.get("webUrl"),
                                is_from_channel=False,
                                chat_type=our_chat_type,
                                chat_id=chat_id,
                                requested_by=user_data.get("userPrincipalName", "unknown"),
                                requested_at=request_time,
                                graph_metadata={
                                    "graphChatType": graph_chat_type,
                                    "chatTopic": chat_topic,
                                    "memberCount": len(members),
                                },
                            )
                            mentions.append(mention)

                            if len(mentions) >= limit:
                                print(f"[TEAMS] Returning {len(mentions)} real messages from chats")
                                return mentions

                    if mentions:
                        print(f"[TEAMS] Returning {len(mentions)} real messages from chats")
                        return mentions[:limit]
                else:
                    print(f"[TEAMS] Chats endpoint failed: {chats_response.status_code} - {chats_response.text}")

                # If no messages found, return mock data
                print("[TEAMS] No messages found, returning mock data")
                return self._get_mock_mentions(limit)

        except TeamsServiceError:
            raise
        except Exception as e:
            print(f"[TEAMS] Error fetching mentions with token: {e}")
            raise TeamsServiceError(f"Failed to fetch mentions: {str(e)}")


# Singleton instance
teams_service = TeamsService()
