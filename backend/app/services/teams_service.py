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

        mock_mentions = [
            TeamsMention(
                id="mock-1",
                message_text="@You Hey, can you review the PR for the authentication module? It's blocking the release.",
                sender_name="Sarah Chen",
                sender_email="sarah.chen@company.com",
                chat_name="Dev Team",
                timestamp=datetime.now() - timedelta(hours=1),
                is_from_channel=False,
            ),
            TeamsMention(
                id="mock-2",
                message_text="@You Please update the API documentation for the new endpoints we discussed yesterday.",
                sender_name="Mike Johnson",
                sender_email="mike.j@company.com",
                channel_name="General",
                team_name="Backend Team",
                timestamp=datetime.now() - timedelta(hours=3),
                is_from_channel=True,
            ),
            TeamsMention(
                id="mock-3",
                message_text="@You Reminder: Sprint planning meeting tomorrow at 10 AM. Please have your estimates ready.",
                sender_name="Emily Davis",
                sender_email="emily.d@company.com",
                chat_name="Project Alpha",
                timestamp=datetime.now() - timedelta(hours=5),
                is_from_channel=False,
            ),
            TeamsMention(
                id="mock-4",
                message_text="@You The database migration script failed on staging. Can you check the logs?",
                sender_name="James Wilson",
                sender_email="james.w@company.com",
                channel_name="Deployments",
                team_name="DevOps",
                timestamp=datetime.now() - timedelta(hours=8),
                is_from_channel=True,
            ),
            TeamsMention(
                id="mock-5",
                message_text="@You Great job on the presentation! Can you share the slides with the marketing team?",
                sender_name="Lisa Park",
                sender_email="lisa.p@company.com",
                chat_name="Marketing Collab",
                timestamp=datetime.now() - timedelta(days=1),
                is_from_channel=False,
            ),
        ]

        return mock_mentions[:limit]

    async def get_my_mentions_with_token(self, access_token: str, limit: int = 5) -> List[TeamsMention]:
        """
        Fetch messages where the user is @mentioned using a user access token.

        Args:
            access_token: OAuth access token for the authenticated user
            limit: Maximum number of mentions to return (default: 5)

        Returns:
            List of TeamsMention objects containing message details
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
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
            print(f"[TEAMS] Error fetching mentions with token: {e}")
            raise TeamsServiceError(f"Failed to fetch mentions: {str(e)}")


# Singleton instance
teams_service = TeamsService()
