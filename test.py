import urllib.request
def check(url):
    try:
        req = urllib.request.Request(url)
        res = urllib.request.urlopen(req)
        print(url, res.getcode())
    except Exception as e:
        print(url, e)

check('https://vyaparsync.onrender.com/orders/my')
check('https://vyaparsync.onrender.com/orders/customer')
check('https://vyaparsync.onrender.com/products/my-wishlist')
