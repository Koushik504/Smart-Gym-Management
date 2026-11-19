"""Configure ONLY the dedicated workspace instance, once. Credentials stay private."""
from pathlib import Path
from urllib.parse import quote
import secrets
import pymysql
root = Path(__file__).resolve().parents[1]
marker = root.parent / '.local' / 'smartgym-admin.env'
if marker.exists():
    print('Existing dedicated Smart Gym accounts preserved')
else:
    password, admin_password = secrets.token_hex(24), secrets.token_hex(32)
    conn = pymysql.connect(host='127.0.0.1', port=3308, user='root')
    with conn.cursor() as cur:
        cur.execute('CREATE DATABASE smart_gym CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        cur.execute("CREATE USER 'smart_gym_app'@'127.0.0.1' IDENTIFIED BY %s", (password,))
        cur.execute("GRANT ALL PRIVILEGES ON smart_gym.* TO 'smart_gym_app'@'127.0.0.1'")
        cur.execute("ALTER USER 'root'@'localhost' IDENTIFIED BY %s", (admin_password,))
    conn.close()
    marker.write_text('MYSQL_ADMIN_PASSWORD='+admin_password+'\nMYSQL_PORT=3308\n',encoding='utf8')
    env = root / '.env'
    if env.exists():
        (root / '.env.legacy-reference').write_bytes(env.read_bytes())
    env.write_text('DATABASE_URL=mysql://smart_gym_app:'+quote(password,safe='')+'@127.0.0.1:3308/smart_gym\nMONGODB_URI=mongodb://127.0.0.1:27017\nMONGODB_DB=smart_gym\nAPP_ORIGIN=http://127.0.0.1:3100\nCOOKIE_SECURE=false\nSEED_ADMIN_PASSWORD=LocalAdmin!2026\nSEED_TRAINER_PASSWORD=LocalTrainer!2026\n',encoding='utf8')
    print('Dedicated database and generated private credentials configured; no secrets displayed')
