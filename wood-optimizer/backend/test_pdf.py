import requests
token_res = requests.post("http://localhost:8000/api/token", data={"username":"ufficio", "password":"password"})
token = token_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
r = requests.get("http://localhost:8000/api/stock", headers=headers)
stock = r.json()
print("Stock:", stock)
if stock:
    print("Testing PDF for stock ID:", stock[0]['id'])
    # Add token header? No, it's public in the backend!
    r2 = requests.get(f"http://localhost:8000/api/stock/{stock[0]['id']}/pdf")
    print(r2.status_code, r2.text[:200])
