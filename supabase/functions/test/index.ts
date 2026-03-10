Deno.serve(async (req) => {
  return new Response(JSON.stringify({
    message: 'Test function is working',
    timestamp: new Date().toISOString(),
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});