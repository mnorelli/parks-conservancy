# Parks Conservancy Server Configuration

## Varnish

### Server Provisioning

1. Using the parks-aws@stamen.com AWS account, launch a new instance (small?)
   in US-East-1 using the Ubuntu 12.04 LTS AMI.
2. Connect to it: `ssh -i ~/.ssh/parks-conservancy-us-east-1.pem ubuntu@<ip>`
3. Add the Varnish apt repository: `sudo add-apt-repository "deb http://repo.varnish-cache.org/ubuntu/ precise varnish-3.0"`
4. Upgrade the system: `sudo apt-get update && sudo apt-get -y upgrade`
5. Upgrade the kernel: `sudo apt-get install -y linux-headers-virtual linux-image-virtual linux-virtual`
6. Reboot into the new kernel: `sudo shutdown -r now`
7. Reconnect (#2)
8. Install varnish: `sudo apt-get install -y --force-yes varnish`
9. Copy the replacement `/etc/varnish/default.vcl` into place.
10. Copy the replacement `/etc/default/varnish` into place.
11. Restart varnish: `sudo /etc/init.d/varnish restart`

