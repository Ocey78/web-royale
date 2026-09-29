"""Real-browser CSS regression: magic item captions must be inside their box."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':540,'height':960})
 page.set_content('<div id="viewport" style="position:relative;width:540px;height:960px"><div class="end-battle-reward"><strong>Reward</strong><div class="end-reward-items" style="display:flex"><div class="end-reward-box">Chest</div><div class="end-reward-box">Gold</div><div class="end-reward-box end-reward-magic"><span class="end-reward-amount">+1</span><small>Magic Coin</small></div></div></div></div>')
 page.add_style_tag(content='\n'.join((root/'src'/f).read_text() for f in ['v370.css','v391.css','v430.css']))
 ok=page.locator('.end-reward-magic small').evaluate('(e)=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom}')
 b.close()
 assert ok,'Magic item caption is outside its reward box'
 print('PASS magic-item caption remains inside its own reward box')
