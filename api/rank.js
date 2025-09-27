import fetch from 'node-fetch';

const groupId = parseInt(process.env.GROUP_ID, 10);
const requiredRank = parseInt(process.env.REQUIRED_RANK, 10);
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

// 🔹 Extra manual checks
const extraGroupId = 34419564;        // <-- TGE of Oom
const extraRequiredRank = 24;       // <-- replace with required rank for that group
const alwaysAllowedUsers = [944593970, 32404749]; // <-- Oom, other pain IRC member

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
    // ✅ Explicit allow list
    if (alwaysAllowedUsers.includes(Number(ownerId))) {
      console.log(`User ${ownerId} is always allowed.`);
      return res.status(200).json({ success: true, message: "User explicitly allowed" });
    }

    const response = await fetch(`https://groups.roblox.com/v1/users/${ownerId}/groups/roles`);
    const responseBody = await response.json();

    if (!response.ok) {
      const errorMessage = `Failed to fetch groups: ${response.statusText}`;
      await sendWebhookMessage(`Error: ${errorMessage} Player ID: ${ownerId}, Product: ${name || 'Unknown'}, Profile: https://www.roblox.com/users/${ownerId}/profile`);
      return res.status(response.status).json({ success: false, message: "Failed to fetch user groups" });
    }

    // ✅ First check env-based group/rank
    const userGroup = responseBody.data.find(group => group.group.id === groupId);
    if (userGroup && userGroup.role.rank >= requiredRank) {
      return res.status(200).json({ success: true });
    }

    // ✅ Then check extra manual group/rank
    const extraGroup = responseBody.data.find(group => group.group.id === extraGroupId);
    if (extraGroup && extraGroup.role.rank >= extraRequiredRank) {
      return res.status(200).json({ success: true });
    }

    // ❌ No group matched
    const errorMessage = `Insufficient rank or not in required group(s).`;
    await sendWebhookMessage(`⚠️ ${errorMessage} Player ID: ${ownerId}, Product: ${name || 'Unknown'}, Profile: https://www.roblox.com/users/${ownerId}/profile`);
    return res.status(200).json({ success: false, message: "Insufficient rank" });

  } catch (error) {
    const errorMessage = `Error: ${error.message}`;
    await sendWebhookMessage(`❌ ${errorMessage} Player ID: ${ownerId}, Name: ${name || 'Unknown'}, Profile: https://www.roblox.com/users/${ownerId}/profile`);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

