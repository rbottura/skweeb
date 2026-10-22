// scripts/obs/ObsSocket.cs — obs-websocket 5, the little of it the overlay asks: identify with the
// password OBS keeps, request, hear events.
// Compiled with Overlay.cs by overlay.ps1. skweeb's own, as the rest of the repo is.

using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace Skweeb
{
    /// <summary>obs-websocket 5, the little of it the overlay asks: identify, request, hear events.</summary>
    public sealed class ObsSocket
    {
        readonly ClientWebSocket ws = new ClientWebSocket();
        readonly ConcurrentDictionary<string, TaskCompletionSource<JsonElement>> pending = new ConcurrentDictionary<string, TaskCompletionSource<JsonElement>>();
        readonly SemaphoreSlim sending = new SemaphoreSlim(1, 1);
        static readonly JsonSerializerOptions Json = new JsonSerializerOptions { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
        int next;

        /// <summary>An event OBS sent: its type and its data. Raised off the UI thread.</summary>
        public event Action<string, JsonElement> Heard;
        public string Version = "";

        static string B64Sha(string s) { using (var sha = SHA256.Create()) return Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(s))); }

        /// <summary>The authentication obs-websocket 5 asks: base64(sha256(base64(sha256(password + salt)) + challenge)).</summary>
        public static string Answer(string password, string salt, string challenge) { return B64Sha(B64Sha(password + salt) + challenge); }

        public async Task Connect(Uri url, string password, int events)
        {
            await ws.ConnectAsync(url, CancellationToken.None);
            JsonElement d = (await ReceiveOne()).GetProperty("d");
            JsonElement v;
            Version = d.TryGetProperty("obsWebSocketVersion", out v) ? v.GetString() : "";
            string auth = null;
            JsonElement a;
            if (d.TryGetProperty("authentication", out a))
            {
                if (string.IsNullOrEmpty(password)) throw new Exception("OBS asks for its WebSocket password, and none was found");
                auth = Answer(password, a.GetProperty("salt").GetString(), a.GetProperty("challenge").GetString());
            }
            await Send(new { op = 1, d = new { rpcVersion = 1, authentication = auth, eventSubscriptions = events } });
            JsonElement identified;
            try { identified = await ReceiveOne(); }
            catch (Exception) { throw new Exception("OBS did not take the password"); }
            if (identified.GetProperty("op").GetInt32() != 2) throw new Exception("OBS did not identify the overlay");
            var listening = Task.Run(Listen);
        }

        async Task Send(object message)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message, Json));
            await sending.WaitAsync();
            try { await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None); }
            finally { sending.Release(); }
        }

        async Task<JsonElement> ReceiveOne()
        {
            var buffer = new byte[64 * 1024];
            using (var all = new MemoryStream())
            {
                WebSocketReceiveResult got;
                do
                {
                    got = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    if (got.MessageType == WebSocketMessageType.Close) throw new Exception("OBS closed the connection: " + got.CloseStatusDescription);
                    all.Write(buffer, 0, got.Count);
                } while (!got.EndOfMessage);
                using (var doc = JsonDocument.Parse(all.ToArray())) return doc.RootElement.Clone();
            }
        }

        async Task Listen()
        {
            try
            {
                while (ws.State == WebSocketState.Open)
                {
                    JsonElement message = await ReceiveOne(), d = message.GetProperty("d");
                    int op = message.GetProperty("op").GetInt32();
                    TaskCompletionSource<JsonElement> waiting;
                    if (op == 7 && pending.TryRemove(d.GetProperty("requestId").GetString(), out waiting)) waiting.TrySetResult(d);
                    else if (op == 5 && Heard != null) Heard(d.GetProperty("eventType").GetString(), d.TryGetProperty("eventData", out var data) ? data : default(JsonElement));
                }
            }
            catch (Exception err)
            {
                foreach (var waiting in pending.Values) waiting.TrySetException(err);
                if (Heard != null) Heard("OverlayLost", default(JsonElement));
            }
        }

        /// <summary>A request and its response's data; throws when OBS says it failed.</summary>
        public async Task<JsonElement> Request(string type, object data = null)
        {
            string id = Interlocked.Increment(ref next).ToString();
            var answer = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
            pending[id] = answer;
            await Send(new { op = 6, d = new { requestType = type, requestId = id, requestData = data } });
            if (await Task.WhenAny(answer.Task, Task.Delay(5000)) != answer.Task) { pending.TryRemove(id, out answer); throw new Exception(type + ": OBS did not answer"); }
            JsonElement d = await answer.Task, status = d.GetProperty("requestStatus");
            if (!status.GetProperty("result").GetBoolean())
                throw new Exception(type + ": " + (status.TryGetProperty("comment", out var c) ? c.GetString() : "code " + status.GetProperty("code").GetInt32()));
            JsonElement r;
            return d.TryGetProperty("responseData", out r) ? r : default(JsonElement);
        }
    }
}
