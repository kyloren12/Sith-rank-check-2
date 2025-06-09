import fetch from 'node-fetch';

const groupId = parseInt(process.env.GROUP_ID, 10);
const requiredRank = parseInt(process.env.REQUIRED_RANK, 10);
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

const sendWebhookMessage = async (message) => {
  try {
    await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
  } catch (err) {
    console.error('Error sending webhook message:', err.message);
  }
};

export default async function handler(req, res) {
  const { ownerId, name } = req.query;

  if (!ownerId) {
    const errorMessage = `OwnerId is required.`;
    await sendWebhookMessage(`Error: ${errorMessage} Name: ${name || 'Unknown'}`);
    return res.status(400).json({ success: false, message: errorMessage });
  }

  try {
    const response = await fetch(`https://groups.roblox.com/v1/users/${ownerId}/groups/roles`);
    const responseBody = await response.json();

    if (!response.ok) {
      const errorMessage = `Failed to fetch groups: ${response.statusText}`;
      await sendWebhookMessage(`Error: ${errorMessage} Player ID: ${ownerId}, Product: ${name || 'Unknown'}, Profile: https://www.roblox.com/users/${ownerId}/profile`);
      return res.status(response.status).json({ success: false, message: "Failed to fetch user groups" });
    }

    const userGroup = responseBody.data.find(group => group.group.id === groupId);
    if (!userGroup) {
      const errorMessage = `User is not a member of the group.`;
      await sendWebhookMessage(`Error: ${errorMessage} Player ID: ${ownerId}, Product: ${name || 'Unknown'}, Profile: https://www.roblox.com/users/${ownerId}/profile`);
      return res.status(404).json({ success: false, message: "User not in group" });
    }

    if (userGroup.role.rank >= requiredRank) {
      return res.status(200).json({ success: true });
    } else {
      const errorMessage = `Insufficient rank.`;
      await sendWebhookMessage(`⚠️ ${errorMessage} Player ID: ${ownerId}, Product: ${name || 'Unknown'}, Profile: https://www.roblox.com/users/${ownerId}/profile`);
      return res.status(200).json({ success: false, message: "Insufficient rank" });
    }
  } catch (error) {
    const errorMessage = `Error: ${error.message}`;
    await sendWebhookMessage(`❌ ${errorMessage} Player ID: ${ownerId}, Name: ${name || 'Unknown'}, Profile: https://www.roblox.com/users/${ownerId}/profile`);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

