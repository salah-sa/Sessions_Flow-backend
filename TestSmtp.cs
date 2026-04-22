using System;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

class Program {
    static async Task Main(string[] args) {
        try {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SessionFlow", "salahfdasalahfda.11188@gmail.com"));
            message.To.Add(new MailboxAddress("", "salahfdasalahfda.11188@gmail.com"));
            message.Subject = "Test Email";
            message.Body = new TextPart("plain") { Text = "Test" };

            using var client = new SmtpClient();
            await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync("salahfdasalahfda.11188@gmail.com", "ssyk czpw lbny dxyu");
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            Console.WriteLine("SUCCESS");
        } catch (Exception ex) {
            Console.WriteLine("ERROR: " + ex.ToString());
        }
    }
}
