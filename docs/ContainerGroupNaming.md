## Container Group Naming Conventions

The ACI container groups deployed by this application are dynamically created, and follow the following naming convention:

```
aci-inst-{last 12 bytes from v4 UUID}
```

Below are a few examples of these dynamically created names:

```
aci-inst-18ff0bdbc53c
aci-inst-6cfcb25fd372
aci-inst-7377a1fb3e1c
```