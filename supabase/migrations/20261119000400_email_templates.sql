-- ============================================================================
-- Default email wording. Everything here can be edited from Admin → Emails.
-- Formatting: blank line = new paragraph, **bold**, "- " bullet lines,
-- [[Button label|{{url}}]] renders a button.
-- ============================================================================

insert into public.email_templates (key, name, description, subject, body, variables) values
(
  'welcome',
  'Welcome',
  'Sent the moment the first payment is confirmed and the account becomes active.',
  'Welcome to Luxuriate, {{first_name}}. Your customer ID is {{customer_id}}',
  E'Hi {{first_name}},\n\nYour payment is confirmed and your {{package_name}} package is now active. Welcome to the Luxuriate family.\n\n**Customer ID:** {{customer_id}}\n**Package:** {{package_name}}, {{monthly_amount}} a month\n**Collection point:** {{collection_point}}\n\nWe will email you a few days before each monthly payment is due, and you can pay in a few taps from your dashboard.\n\n[[Open your dashboard|{{dashboard_url}}]]\n\nYour referral code is **{{referral_code}}**. Share it with friends and family when they join.',
  array['first_name','full_name','customer_id','package_name','monthly_amount','collection_point','referral_code','dashboard_url']
),
(
  'payment_confirmation',
  'Payment confirmation',
  'Sent after every confirmed payment, with the receipt number and balance.',
  'Payment received: {{amount}} (receipt {{receipt_number}})',
  E'Hi {{first_name}},\n\nWe have received your payment of **{{amount}}** for {{months_label}}. Thank you.\n\n**Receipt:** {{receipt_number}}\n**Paid so far:** {{total_paid}} of {{total_due}} ({{paid_count}} of {{duration}} months)\n**Balance left:** {{balance}}\n\n[[Download your receipt|{{receipt_url}}]]',
  array['first_name','full_name','customer_id','package_name','amount','months_label','receipt_number','total_paid','total_due','paid_count','duration','balance','receipt_url','dashboard_url']
),
(
  'payment_reminder',
  'Monthly reminder',
  'Sent a few days before each due date (set the number of days in Settings).',
  'Your {{month_label}} contribution is due on {{due_date}}',
  E'Hi {{first_name}},\n\nThis is a friendly reminder that your {{package_name}} contribution of **{{amount}}** for {{month_label}} is due on **{{due_date}}**.\n\nYou have paid {{paid_count}} of {{duration}} months so far.\n\n[[Pay now|{{pay_url}}]]\n\nYou can pay by card, bank transfer or USSD. If you have already paid, please ignore this message.',
  array['first_name','full_name','customer_id','package_name','amount','month_label','due_date','paid_count','duration','pay_url','dashboard_url']
),
(
  'payment_overdue',
  'Overdue notice',
  'Sent once when a month is past its due date and grace period.',
  'Your {{month_label}} contribution is overdue',
  E'Hi {{first_name}},\n\nWe have not yet received your {{package_name}} contribution of **{{amount}}** for {{month_label}}, which was due on {{due_date}}.\n\nPlease pay as soon as you can so your package stays on track.\n\n[[Pay now|{{pay_url}}]]\n\nIf something has come up, reply to this email and we will be glad to help.',
  array['first_name','full_name','customer_id','package_name','amount','month_label','due_date','pay_url','dashboard_url']
),
(
  'contribution_completed',
  'Contributions completed',
  'Sent straight after the final monthly payment.',
  'Every month is paid. Thank you, {{first_name}}',
  E'Hi {{first_name}},\n\nCongratulations! You have completed all {{duration}} months of your {{package_name}} package.\n\nOur team will now buy and pack your foodstuff. We will email you as it moves from preparing, to ready, to your collection date at **{{collection_point}}**.\n\n{{savings_line}}\n\n[[View your package|{{dashboard_url}}]]',
  array['first_name','full_name','customer_id','package_name','duration','collection_point','savings_line','dashboard_url']
),
(
  'fulfilment_preparing',
  'Package: preparing',
  'Sent when staff move a package to Preparing.',
  'Your {{package_name}} package is being prepared',
  E'Hi {{first_name}},\n\nGood news: our team has started buying and packing your {{package_name}} package.\n\nWe will let you know as soon as it is ready for collection.\n\n[[Track your package|{{dashboard_url}}]]',
  array['first_name','full_name','customer_id','package_name','collection_point','dashboard_url']
),
(
  'fulfilment_ready',
  'Package: ready',
  'Sent when staff move a package to Ready.',
  'Your {{package_name}} package is ready',
  E'Hi {{first_name}},\n\nYour {{package_name}} package is packed and ready. We will confirm your collection date and time at **{{collection_point}}** shortly.\n\n[[Track your package|{{dashboard_url}}]]',
  array['first_name','full_name','customer_id','package_name','collection_point','dashboard_url']
),
(
  'fulfilment_collection_scheduled',
  'Package: collection scheduled',
  'Sent when staff schedule a collection date.',
  'Collection scheduled: {{collection_date}}',
  E'Hi {{first_name}},\n\nYour {{package_name}} package is ready for collection.\n\n**When:** {{collection_date}}\n**Where:** {{collection_point}}\n{{collection_address}}\n\nPlease bring your customer ID, **{{customer_id}}**, when you come.\n\n{{note}}\n\n[[View details|{{dashboard_url}}]]',
  array['first_name','full_name','customer_id','package_name','collection_date','collection_point','collection_address','note','dashboard_url']
),
(
  'fulfilment_collected',
  'Package: collected',
  'Sent when staff mark a package as collected.',
  'Enjoy your foodstuff, {{first_name}}',
  E'Hi {{first_name}},\n\nYour {{package_name}} package has been collected. Thank you for saving with Luxuriate this year.\n\nWe would love to have you back for the next cycle.',
  array['first_name','full_name','customer_id','package_name','dashboard_url']
),
(
  'savings_return_paid',
  'Savings return paid',
  'Sent when staff mark a savings return as paid.',
  'Your savings return of {{savings_return}} has been sent',
  E'Hi {{first_name}},\n\nWe have sent your savings return of **{{savings_return}}** for your {{package_name}} package.\n\n{{reference_line}}\n\nThank you for saving with us.',
  array['first_name','full_name','customer_id','package_name','savings_return','reference_line','dashboard_url']
),
(
  'staff_invite',
  'Staff invitation',
  'Sent when the owner invites a staff member to the back office.',
  'You have been invited to the Luxuriate back office',
  E'Hi {{first_name}},\n\n{{inviter_name}} has invited you to help manage Luxuriate Foodstuff.\n\nClick below to set your password and sign in. This link expires in 24 hours.\n\n[[Set your password|{{action_url}}]]',
  array['first_name','inviter_name','action_url']
),
(
  'password_reset',
  'Password reset',
  'Sent when someone asks to reset their password.',
  'Reset your Luxuriate password',
  E'Hi {{first_name}},\n\nWe received a request to reset your password. Click below to choose a new one. This link expires in one hour.\n\n[[Choose a new password|{{action_url}}]]\n\nIf you did not ask for this, you can safely ignore this email.',
  array['first_name','action_url']
)
on conflict (key) do nothing;
