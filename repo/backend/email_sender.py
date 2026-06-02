import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os
import logging
from dotenv import load_dotenv
from typing import List, Optional
import pandas as pd

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailSender:
    def __init__(self):
        self.smtp_host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("EMAIL_PORT", 587))
        self.username = os.getenv("EMAIL_USER")
        self.password = os.getenv("EMAIL_PASSWORD")
        
        if not all([self.username, self.password]):
            logger.warning("Email credentials not fully configured. Email sending will be disabled.")
            self.configured = False
        else:
            self.configured = True
    
    def _create_message(self, subject: str, recipients: List[str], body: str, 
                        attachments: Optional[List[dict]] = None) -> MIMEMultipart:
        msg = MIMEMultipart("alternative")
        msg["From"] = self.username
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        
        html_body = self._markdown_to_html(body)
        
        msg.attach(MIMEText(body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        
        if attachments:
            for att in attachments:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(att["content"])
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename= {att['filename']}",
                )
                msg.attach(part)
        
        return msg
    
    def _markdown_to_html(self, markdown_text: str) -> str:
        import markdown
        
        html = markdown.markdown(
            markdown_text,
            extensions=[
                'extra',
                'tables',
                'fenced_code',
                'codehilite',
                'sane_lists'
            ]
        )
        
        styled_html = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                h1 {{
                    color: #1a5276;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                }}
                h2 {{
                    color: #2874a6;
                    margin-top: 30px;
                }}
                h3 {{
                    color: #2e86c1;
                }}
                table {{
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }}
                th {{
                    background-color: #3498db;
                    color: white;
                }}
                tr:nth-child(even) {{
                    background-color: #f2f2f2;
                }}
                code {{
                    background-color: #f4f4f4;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: 'Courier New', monospace;
                }}
                pre {{
                    background-color: #f4f4f4;
                    padding: 15px;
                    border-radius: 4px;
                    overflow-x: auto;
                }}
                blockquote {{
                    border-left: 4px solid #3498db;
                    margin: 20px 0;
                    padding: 10px 20px;
                    background-color: #f8f9f9;
                }}
                hr {{
                    border: none;
                    border-top: 1px solid #eee;
                    margin: 30px 0;
                }}
                ul, ol {{
                    margin: 15px 0;
                    padding-left: 30px;
                }}
                li {{
                    margin: 5px 0;
                }}
                strong {{
                    color: #1a5276;
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #999;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            {html}
            <div class="footer">
                <p>此邮件由水族馆声学分析系统自动生成。如有疑问，请联系饲养团队。</p>
            </div>
        </body>
        </html>
        """
        
        return styled_html
    
    def send_email(self, subject: str, recipients: List[str], body: str, 
                   attachments: Optional[List[dict]] = None) -> bool:
        if not self.configured:
            logger.warning("Email not configured. Skipping email send.")
            logger.info(f"Would have sent to {recipients}: {subject}")
            return False
        
        try:
            msg = self._create_message(subject, recipients, body, attachments)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {len(recipients)} recipients")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_to_education_department(self, report_content: str, subject: str = None) -> bool:
        education_recipients = [
            "education@aquarium.com",
            "public.engagement@aquarium.com"
        ]
        
        if not subject:
            subject = "【水族馆教育部门】动物行为报告及展览调整建议"
        
        return self.send_email(subject, education_recipients, report_content)
    
    def send_to_care_team(self, report_content: str, subject: str = None) -> bool:
        care_team_recipients = [
            "careteam@aquarium.com",
            "veterinary@aquarium.com",
            "animal.welfare@aquarium.com"
        ]
        
        if not subject:
            subject = "【饲养团队】动物健康评估与丰容计划"
        
        return self.send_email(subject, care_team_recipients, report_content)
    
    def send_full_report(self, report_content: str, meeting_summary: dict) -> dict:
        logger.info("Sending full report to all relevant departments")
        
        results = {}
        
        care_subject = f"【饲养团队】动物行为讨论纪要 - {pd.Timestamp.now().strftime('%Y-%m-%d')}"
        results["care_team"] = self.send_to_care_team(report_content, care_subject)
        
        education_subject = f"【教育部门】动物行为报告及展览建议 - {pd.Timestamp.now().strftime('%Y-%m-%d')}"
        results["education_department"] = self.send_to_education_department(report_content, education_subject)
        
        logger.info(f"Email sending results: {results}")
        return results
    
    def send_with_attachments(self, recipients: List[str], subject: str, body: str, 
                               attachment_paths: List[str]) -> bool:
        attachments = []
        for path in attachment_paths:
            try:
                with open(path, "rb") as f:
                    attachments.append({
                        "filename": os.path.basename(path),
                        "content": f.read()
                    })
            except Exception as e:
                logger.warning(f"Failed to read attachment {path}: {e}")
        
        return self.send_email(subject, recipients, body, attachments)
