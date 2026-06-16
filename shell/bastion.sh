# Bastion Host
Host bastion
  HostName      BASTION_PUBLIC_IP 44.201.10.170
  User          ec2-user
  IdentityFile  ~/.ssh/your-key.pem

# Private Instance (jump through bastion)
Host private-server
  HostName      PRIVATE_IP       
  User          ec2-user
  IdentityFile  ~/.ssh/your-key.pem
  ProxyJump     bastion