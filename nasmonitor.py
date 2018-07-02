#coding:utf8
import requests
import ccxt
import json
import time
import os
import urllib

okex = ccxt.okex()
huobipro = ccxt.huobipro()
binance = ccxt.binance()
gateio = ccxt.gateio()

def dwonload_exrate():
    f = './exrates.json'
    def download():
        # update exchange rate per hour
        url = "https://www.okex.com/v2/market/rate/getRateByRateName/usd_cny"
        print (url)
        try:
            ret = requests.get(url)
            if ret.status_code==200:
                rates = ret.json()['data'][0]
                usdt_cny_rate =rates['pairAvg']
                
                data = dict()
                data['usdt_cny_rate'] = usdt_cny_rate
                data['timestamp'] = int(time.time())
                print (data)
                open(f, 'w').write(json.dumps(data))
                return (data['usdt_cny_rate'])
            else:
                print (ret)

        except Exception as e:
            print (str(e))
            return 0

    
    if os.path.isfile(f):
        data = json.loads(open(f).read())
        if int(data['timestamp'])  + 3600 > int(time.time()):
            return data['usdt_cny_rate']
    
    return (download())

def downloadprice():
    price = dict()
    def combile_binace():
        ret = {
            'last': 0, 
            'timestamp': 0
        }
        try:
            btc = binance.fetch_ticker('NAS/BTC')
            usdt = binance.fetch_ticker('BTC/USDT')
            ret['last'] = btc['last'] * usdt['last']
            ret['timestamp'] = usdt['timestamp']
        except Exception as e:
            print(e)
        return ret

    price = {
        'okex': okex.fetch_ticker('NAS/USDT'),
        'huobi': huobipro.fetch_ticker('NAS/USDT'),
        'binance':combile_binace(),
        'usdtrate': dwonload_exrate(),
        'gateio': gateio.fetch_ticker('NAS/USDT'),
    }
    open("nasprice.json","w").write(json.dumps(price))
    return price

def downloadusers():
    dappAddress = 'n1vFCSpnzoVFqqYmYYfyDnZBUKAP27tQwZn'
    mainnet_url = 'https://mainnet.nebulas.io/v1/user/call';
    params = '{"from":"' + dappAddress +'","to":"' +dappAddress+'","value":"0","nonce":"0","gasPrice":"1000000","gasLimit":"2000000","contract":{"function":"list","args":"[]"}}';

    data = requests.post(mainnet_url, params).json()
    if data['result']['result']:
        open('./notify_list.json', 'w').write(data['result']['result'])
        return json.loads(data['result']['result'])

def send(mobile, ex, price):
    import http.client as httplib
    import urllib
    apikey = ""
    # 服务地址
    sms_host = "sms.yunpian.com"
    voice_host = "voice.yunpian.com"
    # 端口号
    port = 443
    # 版本号
    version = "v2"
    sms_tpl_send_uri = "/" + version + "/sms/tpl_single_send.json"

    def tpl_send_sms(apikey, tpl_id, tpl_value, mobile):
        """
        模板接口发短信
        """
        params = urllib.parse.urlencode({
            'apikey': apikey,
            'tpl_id': tpl_id,
            'tpl_value': urllib.parse.urlencode(tpl_value),
            'mobile': mobile
        })
        headers = {
            "Content-type": "application/x-www-form-urlencoded",
            "Accept": "text/plain"
        }
        conn = httplib.HTTPSConnection(sms_host, port=port, timeout=30)
        conn.request("POST", sms_tpl_send_uri, params, headers)
        response = conn.getresponse()
        response_str = response.read()
        conn.close()
        return response_str

    tpl_id = 2362954
    tpl_value = {'#exchagne#': str(ex), '#price#': str(round(price, 2))}
    print (tpl_value)
    print (tpl_send_sms(apikey, tpl_id, tpl_value, mobile))

def is_ok_send(user, setting_price):
    f = "records.txt"
    if os.path.isfile(f):
        records = json.loads(open(f).read())

        if user in records["users"]:
            sends = records['sends'][user['tel']]
            if setting_price in sends:
                return False
            else:
                records['sends'][user['tel']].append(setting_price)
                open(f, "w").write(json.dumps(records))
                return True
        else:  # 更改了配置, 或者非首个用户
            records["users"].append(user) # 未删除更改配置之前的信息, 但不影响
            records['sends'][user['tel']] = list()
            records['sends'][user['tel']].append(setting_price)
            open(f, "w").write(json.dumps(records))
            return True
    else:
        records = {
            'users': [],
            'sends': {},
        }
        records["users"].append(user)
        tel = str(user['tel'])
        records['sends'][user['tel']] = list()
        records['sends'][user['tel']].append(setting_price)
        print (records)
        open(f, "w").write(json.dumps(records))
        return True

def notify(users, prices):
    for user in users:
        tel = user['tel']
        exs = user['exs']

        try:

            highpricearr = [float(x) for x in user['highprice'].split(' ')]
            lowpricearr = [float(x) for x in user['lowprice'].split(' ')]

            for ex in user['exs'].split('|'):
                exprice = prices[ex]
                if exprice and 'last' in exprice and exprice['last']:
                    if ex == 'binance':
                        price_rmb = exprice['last'] * prices['usdtrate'] * 1.02
                    elif ex == 'huobi':
                        price_rmb = exprice['last'] * prices['usdtrate'] * 1.03
                    elif ex == 'gateio':
                        price_rmb = exprice['last'] * prices['usdtrate'] * 1.03
                    elif ex == 'okex':
                        price_rmb = exprice['last'] * prices['usdtrate']
                else:
                    continue

                if ex == 'binance': 
                    ex = '币安'
                elif ex == 'huobi':
                    ex = '火币'
                
                for price in highpricearr:
                    if price_rmb > price:
                        if is_ok_send(user, price):
                            send(tel, ex, price_rmb)
                            continue
                for price in lowpricearr:
                    if price_rmb < price:
                        if is_ok_send(user, price):
                            send(tel, ex, price_rmb)
                            continue
        except Exception as e:
            print(e)
            pass


def main():
    while True:
        try:
            prices = downloadprice()
            users = downloadusers()
            notify(users, prices)
            print ("price: ", prices['huobi']['last'] , "rate:", prices['usdtrate'] , " users:", len(users))
            time.sleep(30)

        except Exception as e:
            print (e)
            time.sleep(30)
            pass


def test():
    users = [
        {
            'highprices': [10, 15, 20],
            'lowprices': [1, 5, 10],
            'exchanges': ['okex', 'huobi', 'gateio'],
            'mobile':''
        }, 
    ]

    prices = downloadprice()
    users = downloadusers()
    print (prices)
    print(users)

    notify(users, prices)
    send("", "币安", "35.5")
    

if __name__ == '__main__':
    main()
