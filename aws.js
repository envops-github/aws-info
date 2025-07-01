import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeNetworkInterfacesCommand,
  DescribeVolumesCommand,
} from "@aws-sdk/client-ec2";

import fs from "fs/promises";

const region = process.argv[2] || "us-east-1";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("❌ Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as environment variables.");
  process.exit(1);
}

const client = new EC2Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getInstances() {
  const { Reservations = [] } = await client.send(new DescribeInstancesCommand({}));
  const instances = Reservations.flatMap(r =>
    r.Instances.map(inst => ({
      InstanceId: inst.InstanceId,
      InstanceType: inst.InstanceType,
      State: inst.State?.Name,
      Name: inst.Tags?.find(t => t.Key === "Name")?.Value || null,
      PrivateIp: inst.PrivateIpAddress,
      PublicIp: inst.PublicIpAddress || null,
      AZ: inst.Placement?.AvailabilityZone,
    }))
  );
  return instances;
}

async function getVPCs() {
  const { Vpcs = [] } = await client.send(new DescribeVpcsCommand({}));
  return Vpcs.map(v => ({
    VpcId: v.VpcId,
    CidrBlock: v.CidrBlock,
    IsDefault: v.IsDefault,
  }));
}

async function getSubnets() {
  const { Subnets = [] } = await client.send(new DescribeSubnetsCommand({}));
  return Subnets.map(s => ({
    SubnetId: s.SubnetId,
    VpcId: s.VpcId,
    CidrBlock: s.CidrBlock,
    AZ: s.AvailabilityZone,
  }));
}

async function getENIs() {
  const { NetworkInterfaces = [] } = await client.send(new DescribeNetworkInterfacesCommand({}));
  return NetworkInterfaces.map(eni => ({
    NetworkInterfaceId: eni.NetworkInterfaceId,
    PrivateIp: eni.PrivateIpAddress,
    SubnetId: eni.SubnetId,
    VpcId: eni.VpcId,
    Status: eni.Status,
    AttachedInstance: eni.Attachment?.InstanceId || null,
  }));
}

async function getVolumes() {
  const { Volumes = [] } = await client.send(new DescribeVolumesCommand({}));
  return Volumes.map(vol => ({
    VolumeId: vol.VolumeId,
    SizeGiB: vol.Size,
    State: vol.State,
    Type: vol.VolumeType,
    AZ: vol.AvailabilityZone,
    AttachedInstance: vol.Attachments?.[0]?.InstanceId || null,
  }));
}

async function main() {
  try {
    console.log(`📦 Fetching AWS inventory for region ${region}...`);

    const [instances, vpcs, subnets, enis, volumes] = await Promise.all([
      getInstances(),
      getVPCs(),
      getSubnets(),
      getENIs(),
      getVolumes(),
    ]);

    const data = {
      region,
      timestamp: new Date().toISOString(),
      instances,
      vpcs,
      subnets,
      networkInterfaces: enis,
      volumes,
    };

    const filename = `aws-inventory-${region}.json`;
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`✅ Inventory saved to ${filename}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
