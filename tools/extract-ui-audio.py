"""Extract selected original UI cues to PCM WAV. Requires user APK and ffmpeg.
No music loops, fonts, native code, or downloadable dependencies are copied.
"""
from pathlib import Path
from zipfile import ZipFile
import json,hashlib,subprocess,tempfile,argparse
p=argparse.ArgumentParser();p.add_argument('apk',type=Path);args=p.parse_args()
r=Path(__file__).resolve().parents[1];out=r/'assets/audio';out.mkdir(exist_ok=True)
names={'click':'sfx/button_click_02.ogg','select':'sfx/grabcard_01.ogg','deploy':'sfx/deploy_timer_ding_03.ogg','start':'sfx/attack_button_01.ogg','reward':'sfx/get_card_gold_01.ogg','win':'music/scroll_win_02.ogg','lose':'music/scroll_lose_01.ogg','draw':'music/scroll_draw_01.ogg'}
manifest={}
with ZipFile(args.apk)as z,tempfile.TemporaryDirectory() as tmp:
 for key,path in names.items():
  data=z.read('assets/'+path);src=Path(tmp)/(key+'.ogg');src.write_bytes(data);dest=out/(key+'.wav')
  subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(src),'-vn','-ac','1','-ar','44100','-c:a','pcm_s16le',str(dest)],check=True)
  manifest[key]={'file':'assets/audio/'+dest.name,'source':'APK/assets/'+path,'sourceSha256':hashlib.sha256(data).hexdigest(),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Extracted',len(manifest),'original cues')
