import requests
import json
from influxdb import InfluxDBClient

client = InfluxDBClient("192.168.2.253", 8086, "root", "", "cultivate")

def read():
    url = "http://192.168.2.97/rpc"
    headers = {'content-type': 'application/json'}

    # Example echo method
    payload = {
        "method": "Sum",
        "params": [""],
        "jsonrpc": "2.0",
        "id": 0,
    }
    response = requests.post(
        url, data=json.dumps(payload), headers=headers).json()

    json_body = [
                {
                    "measurement": "moist",
                    "tags": {
                        "ip": "192.168.2.97",
                        
                    },
                    "fields": {
                        "moist": response["result"],
                    }
                }
            ]
    print(json_body)
    client.write_points(json_body)



read()