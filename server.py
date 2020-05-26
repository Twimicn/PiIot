from bunnypy import Bunny
import sqlite3
import time
import hashlib
import random

db = Bunny.SQLiteDatabase(sqlite3.connect('sensor.sqlite3'))
app = Bunny(host='0.0.0.0', database=db)


# 用户类
@app.data
class User:
    __pk__ = ['id']
    __ai__ = 'id'
    id = 'integer'
    username = 'varchar(50) not null'
    password = 'varchar(50) not null'
    email = 'varchar(50)'
    role_id = 'integer'
    token = 'text'
    expire = 'datetime'

    def __init__(self, username=None, password=None, email=None):
        self.username = username
        self.password = password
        self.email = email
        self.role_id = 0


# 用户和设备对应关系类
@app.data
class UserDevice:
    __pk__ = ['id']
    __ai__ = 'id'
    id = 'integer not null'
    user_id = 'text not null'
    device_id = 'text not null'
    device_name = 'text'

    def __init__(self, user_id=None, device_id=None, device_name=None):
        self.user_id = user_id
        self.device_id = device_id
        self.device_name = device_name


# 设备历史数据类
@app.data
class SensorData:
    __pk__ = ['id']
    __ai__ = 'id'
    id = 'integer not null'
    device_id = 'text not null'
    temperature = 'text not null'
    humidity = 'text not null'
    timestamp = 'datetime'

    def __init__(self, device_id=None, temperature=None, humidity=None):
        self.device_id = device_id
        self.temperature = temperature
        self.humidity = humidity
        self.timestamp = int(time.time() * 1000)


class Util:
    def __init__(self):
        self._md5 = hashlib.md5()

    def md5(self, txt):
        self._md5.update(txt.encode('utf-8'))
        return self._md5.hexdigest()

    def generate_token(self, username):
        return self.md5('BUNNY_{0}${1}'.format(random.randint(1, 999), username))


class UserService:
    def login(self, username, password):
        _u = User.where('username=? or email=?', [username, username]).get(raw=True)
        if _u is None:
            return {'status': 1002, 'msg': '用户不存在'}
        if _u['password'] != Util().md5(password):
            return {'status': 1001, 'msg': '密码错误'}
        _u['token'] = Util().generate_token(_u['username'])
        _u['expire'] = int(time.time() * 1000) + 86400000
        User.where('id=?', [_u['id']]).update({
            'token': _u['token'],
            'expire': _u['expire'],
        })
        _u['password'] = None
        return {'status': 0, 'msg': 'ok', 'data': _u}

    def register(self, username, password, email):
        _u = User.where('username=? or email=?', [username, email]).get(raw=True)
        if _u is not None:
            return {'status': 1003, 'msg': '用户名已存在'}
        _u = User(username, Util().md5(password), email)
        _u.token = Util().generate_token(username)
        _u.expire = int(time.time() * 1000) + 86400000
        _u.insert()
        _u = User.where('username=? or email=?', [username, email]).get(raw=True)
        _u['password'] = None
        return {'status': 0, 'msg': 'ok', 'data': _u}


# API接口类
@app.controller
class ApiController:
    # 登录
    def ac_login(self, username, password):
        return UserService().login(username, password)

    # 注册
    def ac_register(self, username, password, email):
        return UserService().register(username, password, email)

    def ac_users(self, token):
        u = User.where('token=? and expire>?', [token, int(time.time() * 1000)]).get()
        if u is None or u.role_id != 1:
            return {'status': 2003, 'msg': '非法的Token'}
        ul = User.where().get_all(raw=True)
        return {'status': 0, 'msg': 'ok', 'data': {'list': ul, 'total': len(ul), 'page': 1}}

    # 绑定用户和设备
    def ac_bind(self, token, device_id, device_name):
        u = User.where('token=? and expire>?', [token, int(time.time() * 1000)]).get()
        if u is None:
            return {'status': 2003, 'msg': '非法的Token'}
        ud = UserDevice.where('user_id=? and device_id=?', [u.id, device_id]).get()
        if ud is None:
            UserDevice(u.id, device_id, device_name).insert()
        return {'status': 0}

    # 获取用户下的设备列表
    def ac_devices(self, token):
        u = User.where('token=? and expire>?', [token, int(time.time() * 1000)]).get()
        if u is None:
            return {'status': 2003, 'msg': '非法的Token'}
        devices = UserDevice.where('user_id=?', [u.id]).get_all(raw=True)
        return {'status': 0, 'msg': 'ok', 'data': {'list': devices, 'total': len(devices), 'page': 1}}

    # 获取某个设备的历史数据
    def ac_data(self, id):
        return SensorData.where('device_id=?', [id]).order('timestamp desc').limit(10, 0).get_all(raw=True)

    # 给某个设备新增一条历史数据
    def ac_record(self, id, temp, humi):
        SensorData(id, temp, humi).insert()
        return {'status': 0}


if __name__ == '__main__':
    # 生成数据表
    User.create()
    UserDevice.create()
    SensorData.create()
    # 运行接口程序
    app.run()
