const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send Email using SendGrid
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 */
exports.sendEmail = async (to, subject, text, html = null) => {
  try {
    if (!to || !/\S+@\S+\.\S+/.test(to)) {
      throw new Error('Invalid email address format');
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL; // e.g., 'noreply@yourstore.com'
    const fromName = process.env.SENDGRID_FROM_NAME || 'Your Store'; // e.g., 'Amazing Store'

    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    if (!fromEmail) {
      throw new Error('SendGrid FROM email not configured');
    }

    const msg = {
      to: to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>') // Convert line breaks to HTML if no HTML provided
    };

    const response = await sgMail.send(msg);

    console.log('Email sent successfully to:', to);

    return {
      success: true,
      response: response
    };

  } catch (error) {
    console.error('Email error:', error.response?.body || error.message);
    throw error;
  }
};

/**
 * Send OTP Email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6 digit OTP
 */
exports.sendOTPEmail = async (email, otp) => {
  const subject = 'Your Verification Code';
  
  const text = `Your OTP for checkout verification is: ${otp}

This code is valid for 5 minutes.
Do not share this OTP with anyone.

If you did not request this code, please ignore this email.`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .otp-box { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px;
          margin: 20px 0;
        }
        .otp-code { 
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 20px 0;
        }
        .footer { 
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Email Verification</h2>
        <p>Thank you for shopping with us! Please use the following code to verify your email address:</p>
        
        <div class="otp-box">
          <p style="margin: 0; font-size: 16px;">Your Verification Code</p>
          <div class="otp-code">${otp}</div>
          <p style="margin: 0; font-size: 14px;">Valid for 5 minutes</p>
        </div>
        
        <p><strong>Security reminder:</strong></p>
        <ul>
          <li>Never share this code with anyone</li>
          <li>Our team will never ask for this code</li>
          <li>If you didn't request this code, please ignore this email</li>
        </ul>
        
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await exports.sendEmail(email, subject, text, html);
};

/**
 * Send Order Confirmation Email
 * @param {string} email - Recipient email address
 * @param {string} orderNumber - Order number
 * @param {number} amount - Order amount
 * @param {object} orderDetails - Full order details (optional)
 */
exports.sendOrderConfirmationEmail = async (email, orderNumber, amount, orderDetails = null) => {
  const subject = `Order Confirmation #${orderNumber}`;
  
  const text = `Thank you for your order!

Order Number: #${orderNumber}
Order Amount: ₹${amount}

Your order has been placed successfully and is being processed.
You can track your order status on our website.

Thank you for shopping with us!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content { 
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .order-box { 
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .order-number { 
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
        .amount { 
          font-size: 28px;
          font-weight: bold;
          color: #764ba2;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer { 
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .item-list {
          list-style: none;
          padding: 0;
        }
        .item-list li {
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✓ Order Confirmed!</h1>
          <p style="margin: 10px 0 0 0;">Thank you for your purchase</p>
        </div>
        
        <div class="content">
          <div class="order-box">
            <p style="margin: 0; color: #666;">Order Number</p>
            <div class="order-number">#${orderNumber}</div>
            
            <p style="margin: 20px 0 0 0; color: #666;">Total Amount</p>
            <div class="amount">₹${amount}</div>
          </div>
          
          ${orderDetails && orderDetails.items ? `
            <h3>Order Items:</h3>
            <ul class="item-list">
              ${orderDetails.items.map(item => `
                <li>
                  <strong>${item.name}</strong> x ${item.quantity}<br>
                  <span style="color: #666;">₹${item.price} each</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}
          
          <p>Your order has been placed successfully and is being processed.</p>
          
          <center>
            <a href="${process.env.FRONTEND_URL || 'https://yourstore.com'}/orders/${orderNumber}" class="button">
              Track Your Order
            </a>
          </center>
          
          <p style="margin-top: 30px;"><strong>What's next?</strong></p>
          <ul>
            <li>We'll send you an email when your order ships</li>
            <li>You can track your order anytime on our website</li>
            <li>Expected delivery: 3-5 business days</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Need help? Contact us at support@yourstore.com</p>
          <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await exports.sendEmail(email, subject, text, html);
};

/**
 * Send Order Status Update Email
 * @param {string} email - Recipient email address
 * @param {string} orderNumber - Order number
 * @param {string} status - Order status
 * @param {string} trackingNumber - Tracking number (optional)
 */
exports.sendOrderStatusEmail = async (email, orderNumber, status, trackingNumber = null) => {
  let subject = '';
  let heading = '';
  let message = '';
  let emoji = '';
  
  switch(status) {
    case 'confirmed':
      subject = `Order Confirmed #${orderNumber}`;
      heading = 'Order Confirmed';
      emoji = '✓';
      message = 'Your order has been confirmed and is being processed.';
      break;
    case 'shipped':
      subject = `Order Shipped #${orderNumber}`;
      heading = 'Order Shipped';
      emoji = '🚚';
      message = 'Your order has been shipped! You will receive it soon.';
      break;
    case 'delivered':
      subject = `Order Delivered #${orderNumber}`;
      heading = 'Order Delivered';
      emoji = '🎉';
      message = 'Your order has been delivered. Thank you for shopping with us!';
      break;
    case 'cancelled':
      subject = `Order Cancelled #${orderNumber}`;
      heading = 'Order Cancelled';
      emoji = '❌';
      message = 'Your order has been cancelled. If you have any questions, please contact support.';
      break;
    default:
      subject = `Order Update #${orderNumber}`;
      heading = 'Order Status Update';
      emoji = 'ℹ️';
      message = `Your order status has been updated to: ${status}`;
  }

  const text = `${heading}

Order Number: #${orderNumber}
${trackingNumber ? `Tracking Number: ${trackingNumber}\n` : ''}
${message}

Track your order: ${process.env.FRONTEND_URL || 'https://yourstore.com'}/orders/${orderNumber}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content { 
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .status-box { 
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          border-left: 4px solid #667eea;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer { 
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 48px;">${emoji}</h1>
          <h2 style="margin: 10px 0 0 0;">${heading}</h2>
        </div>
        
        <div class="content">
          <div class="status-box">
            <p style="margin: 0; color: #666;">Order Number</p>
            <h2 style="margin: 10px 0; color: #667eea;">#${orderNumber}</h2>
            ${trackingNumber ? `
              <p style="margin: 20px 0 0 0; color: #666;">Tracking Number</p>
              <p style="margin: 5px 0; font-weight: bold;">${trackingNumber}</p>
            ` : ''}
          </div>
          
          <p style="font-size: 16px;">${message}</p>
          
          <center>
            <a href="${process.env.FRONTEND_URL || 'https://yourstore.com'}/orders/${orderNumber}" class="button">
              View Order Details
            </a>
          </center>
        </div>
        
        <div class="footer">
          <p>Need help? Contact us at support@yourstore.com</p>
          <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await exports.sendEmail(email, subject, text, html);
};

/**
 * Safe email sending with error handling
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 */
exports.sendEmailSafe = async (email, subject, text, html = null) => {
  // Skip email if disabled in environment
  if (process.env.DISABLE_EMAIL === 'true') {
    console.log('Email disabled. Would have sent:', subject);
    return { success: true, disabled: true };
  }

  try {
    return await exports.sendEmail(email, subject, text, html);
  } catch (error) {
    console.error('Email failed but continuing:', error.message);
    return { success: false, error: error.message };
  }
};