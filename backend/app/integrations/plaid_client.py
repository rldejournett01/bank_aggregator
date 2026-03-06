from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from app.core.config import settings

# Configure Plaid
configuration = Configuration(
    host=settings.PLAID_ENV
)

configuration.api_key["clientId"] = settings.PLAID_CLIENT_ID
configuration.api_key["secret"] = settings.PLAID_SECRET

api_client = ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)