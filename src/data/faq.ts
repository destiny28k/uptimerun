// Home page FAQ. Also used for the FAQPage structured data, so keep answers accurate.
export const HOME_FAQ: [string, string][] = [
  ['What is website uptime monitoring?', 'Uptime monitoring is a service that visits your website automatically, every minute or every few minutes, and checks that it loads correctly. If your site goes down, returns an error or stops showing important content, you get an alert straight away, so you can fix it before customers notice.'],
  ['How does UptimeRun check if my website is down?', 'We request your page from our servers at the interval you choose. If it doesn’t answer within your timeout, returns an error code (like 500 or 503), or is missing a keyword you chose, we check again. Two failed checks in a row confirm the outage, then we alert you, and again when it’s back up.'],
  ['Is UptimeRun really free?', 'Yes. The Free plan includes 10 monitors with 5-minute checks, email, Telegram, Slack and Discord alerts and a public status page, free forever. Commercial use is allowed and no credit card is needed.'],
  ['How often are websites checked?', 'Every 5 minutes on Free, every minute on Pro and every 30 seconds on Business. Faster checks mean you hear about downtime sooner.'],
  ['How do I get alerts when my website goes down?', 'Add your email, Telegram, Slack or Discord on the Alert contacts page. All channels are included on every plan. If you haven’t added any, we email your account address.'],
  ['What is a status page?', 'A status page is a public web page that shows your customers whether your website and services are working. When something breaks, it updates automatically, so customers check the page instead of emailing you.'],
  ['Can UptimeRun warn me before my SSL certificate or domain expires?', 'Yes, on Pro and Business. We check your SSL certificate and domain once a day and warn you 30, 14, 7 and 1 day before they expire.'],
  ['What is keyword monitoring?', 'A page can load but still be broken, for example a shop with an empty product list. Keyword monitoring checks that a word like “Add to cart” really appears on the page, and alerts you if it disappears.'],
  ['How long does setup take?', 'About 30 seconds. Sign up, paste your website address, and we start checking right away. No code, plugin or server needed.'],
  ['What happens if I cancel my paid plan?', 'You move back to the Free plan. Your account stays, and monitors and status pages keep working within the Free limits.'],
];
