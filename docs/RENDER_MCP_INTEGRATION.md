# Render MCP Server Integration

## Overview

The Render Model Context Protocol (MCP) server integration enables you to manage your Render infrastructure directly from Cursor using natural language prompts. This provides seamless DevOps capabilities within your development environment.

## Features

### Service Management
- Create and manage web services, static sites, and databases on Render
- Deploy and configure services using natural language

### Monitoring & Analytics
- Fetch and filter service logs in real-time
- Analyze service metrics (CPU utilization, memory usage, request rates)
- Debug production issues without leaving your IDE

### Database Operations
- Query Render Postgres databases directly
- Execute SQL queries and view results inline
- Monitor database performance and connection pools

## Configuration

The MCP server is configured in `.cursor/mcp_config.json`:

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>"
      }
    }
  }
}
```

**Important:** The API key is already configured. Keep this file secure and never commit it to public repositories.

## Usage Examples

Once configured and Cursor is restarted, you can use natural language prompts like:

### Service Management
```
"Create a new web service on Render for the Chravel API"
"Deploy the latest changes to production"
"Show me all running services"
```

### Log Analysis
```
"Show me the last 100 logs from the Chravel API service"
"Filter logs for errors in the last hour"
"What errors are occurring in production?"
```

### Metrics & Performance
```
"What's the CPU usage of my web service?"
"Show memory utilization trends for the past 24 hours"
"Are there any performance issues?"
```

### Database Queries
```
"Query the trips table for the last 10 entries"
"Show me all users created today"
"What's the current database size?"
```

## Security Considerations

The Render MCP server is designed with safety in mind:

✅ **Supported Operations:**
- Read service configurations
- View logs and metrics
- Query databases (read operations)
- Update service environment variables
- Create new services

❌ **Restricted Operations:**
- Delete services (requires manual confirmation)
- Delete databases (not supported via MCP)
- Destructive schema changes

## Getting Started

1. **Restart Cursor** - For the MCP configuration to take effect, restart your IDE
2. **Verify Connection** - Try a simple query like "Show me my Render services"
3. **Explore** - Use natural language to interact with your Render infrastructure

## API Key Management

**Current Status:** API key is configured and active.

**To Rotate the Key:**
1. Generate a new API key from [Render Dashboard → Account Settings](https://dashboard.render.com/account)
2. Update the key in `.cursor/mcp_config.json`
3. Restart Cursor

**Security Best Practices:**
- Never commit `.cursor/mcp_config.json` to public repositories
- Rotate API keys regularly
- Use separate keys for different team members
- Revoke keys immediately if compromised

## Troubleshooting

### MCP Server Not Responding
1. Verify your API key is valid in Render Dashboard
2. Check your internet connection
3. Restart Cursor completely
4. Check Render's status page for outages

### Authorization Errors
- Ensure the API key in the config matches your Render account
- Verify the key hasn't been revoked
- Check that the Bearer token format is correct

### Limited Functionality
- Some operations may require additional permissions
- Verify your Render account has the necessary access levels
- Check if the service/database exists and you have access

## Additional Resources

- [Render MCP Server Documentation](https://render.com/docs/mcp-server)
- [Render API Documentation](https://render.com/docs/api)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

## Integration with Chravel

The Render MCP integration is particularly useful for Chravel's infrastructure:

- **Supabase Edge Functions:** Monitor and deploy serverless functions
- **API Services:** Track performance of backend services
- **Database Management:** Query and analyze Postgres data
- **Production Monitoring:** Real-time log analysis and alerting
- **Environment Variables:** Securely update API keys and configuration

This integration complements Chravel's AI-native architecture by bringing infrastructure management into the same AI-powered workflow used for development.

