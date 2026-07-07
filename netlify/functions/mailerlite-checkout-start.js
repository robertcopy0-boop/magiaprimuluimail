exports.handler = async function(event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { email, prenume, nume, telefon, sumaLei } = JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email lipsă." }) };
    }

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_ABANDONED_GROUP_ID;

    let subscriberId = null;

    const subscriberResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        email,
        fields: {
          name: `${prenume || ""} ${nume || ""}`.trim(),
          phone: telefon || "",
          produs: "Magia Primelor Mailuri",
          suma_lei: String(sumaLei || "")
        }
      })
    });

    const subscriberData = await subscriberResponse.json();

    if (subscriberResponse.ok && subscriberData.data && subscriberData.data.id) {
      subscriberId = subscriberData.data.id;
    } else {
      const searchResponse = await fetch(
        `https://connect.mailerlite.com/api/subscribers?filter[email]=${encodeURIComponent(email)}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey}`
          }
        }
      );

      const searchData = await searchResponse.json();
      const existingSubscriber = searchData.data && searchData.data[0];

      if (!existingSubscriber) {
        throw new Error(subscriberData.message || "Nu am putut crea sau găsi subscriberul.");
      }

      subscriberId = existingSubscriber.id;
    }

    const groupResponse = await fetch(`https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${groupId}`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!groupResponse.ok) {
      const groupData = await groupResponse.json();
      throw new Error(groupData.message || "Nu am putut adăuga subscriberul în grup.");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, subscriberId })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};